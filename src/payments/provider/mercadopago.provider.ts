// src/payments/providers/mercadopago.provider.ts
import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment } from 'mercadopago';
import {
  PaymentProviderService,
  PaymentRequest,
  PaymentResult,
} from './payment-provider.interface';
import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import {
  STATUS_MAPPER_TOKEN,
  type IStatusMapper,
} from './interfaces/status-mapper.interface';
import {
  WEBHOOK_HANDLER_TOKEN,
  type IWebhookHandler,
} from './interfaces/webhook-handler.interface';
import {
  REFUND_SERVICE_TOKEN,
  type IRefundService,
} from './interfaces/refund-service.interface';

@Injectable()
export class MercadoPagoProvider extends PaymentProviderService {
  private readonly logger = new Logger(MercadoPagoProvider.name);
  private mercadopago: MercadoPagoConfig;
  private payment: Payment;

  constructor(
    private readonly configService: ConfigService,
    @Inject(STATUS_MAPPER_TOKEN)
    private readonly statusMapper: IStatusMapper,
    @Inject(WEBHOOK_HANDLER_TOKEN)
    private readonly webhookHandler: IWebhookHandler,
    @Inject(REFUND_SERVICE_TOKEN)
    private readonly refundService: IRefundService,
  ) {
    super();

    const accessToken = this.configService.get<string | undefined>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    if (!accessToken) {
      throw new Error(
        'MERCADOPAGO_ACCESS_TOKEN is required but not configured',
      );
    }

    this.mercadopago = new MercadoPagoConfig({
      accessToken: accessToken,
      options: {
        timeout: 5000,
      },
    });

    this.payment = new Payment(this.mercadopago);
  }

  async getPaymentStatus(externalId: string): Promise<PaymentResult> {
    try {
      this.logger.debug(`Getting payment status for ID: ${externalId}`);

      const response = await this.payment.get({
        id: externalId,
      });

      this.logger.debug('Payment status retrieved:', response);

      return {
        success: this.statusMapper.isSuccessStatus(response.status),
        providerTransactionId: response.id?.toString() || '',
        status: this.statusMapper.mapToInternalStatus(
          response.status as string,
        ),
        error:
          response.status === 'rejected'
            ? response.status_detail || 'Payment rejected'
            : undefined,
      };
    } catch (error) {
      this.logger.error(
        `Error getting payment status for ${externalId}:`,
        error,
      );
      throw new Error(`Failed to get payment status: ${error}`);
    }
  }

  async retryPayment(
    originalProviderRef: string,
    newRequest: PaymentRequest,
  ): Promise<PaymentResult> {
    try {
      this.logger.log(
        `Retrying MP payment. Original: ${originalProviderRef}, New: ${newRequest.id}`,
      );

      // 1. Verificar estado del pago original
      const originalPayment = await this.getPaymentStatus(originalProviderRef);

      if (
        originalPayment.success &&
        originalPayment.status === PaymentStatus.SUCCEEDED
      ) {
        this.logger.warn(
          `Original payment ${originalProviderRef} already succeeded`,
        );
        return originalPayment;
      }

      // 2. Cancelar pago original si está pendiente
      if (originalPayment.status === PaymentStatus.PENDING) {
        await this.cancelPayment(originalProviderRef);
      }

      // 3. Crear nuevo pago (mismo flujo que process)
      const retryResult = await this.processPayment({
        ...newRequest,
        description: `${newRequest.description} (Retry of ${originalProviderRef})`,
      });

      this.logger.log(
        `MP Retry result: ${retryResult.providerTransactionId}, status: ${retryResult.status}`,
      );

      return retryResult;
    } catch (error) {
      this.logger.error(
        `MP retry failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack error found',
      );

      return {
        success: false,
        providerTransactionId: '',
        status: PaymentStatus.FAILED,
        error:
          error instanceof Error
            ? `MercadoPago retry error: ${error.message}`
            : 'Unknown retry error',
      };
    }
  }

  async cancelPayment(providerTransactionId: string): Promise<PaymentResult> {
    try {
      this.logger.log(`Cancelling MP payment: ${providerTransactionId}`);

      // 1. Obtener estado actual
      const currentStatus = await this.getPaymentStatus(providerTransactionId);

      // 2. Verificar si se puede cancelar
      if (currentStatus.status === PaymentStatus.SUCCEEDED) {
        return {
          success: false,
          providerTransactionId,
          status: PaymentStatus.SUCCEEDED,
          error: 'Cannot cancel an approved payment. Use refund instead.',
        };
      }

      if (currentStatus.status === PaymentStatus.FAILED) {
        this.logger.log(
          `Payment ${providerTransactionId} already failed/cancelled`,
        );
        return {
          success: true,
          providerTransactionId,
          status: PaymentStatus.FAILED,
        };
      }

      // 3. Cancelar en MercadoPago
      const response = await this.payment.cancel({ id: providerTransactionId });

      this.logger.log(
        `MP Cancel result: ${response.id}, status: ${response.status}`,
      );

      return {
        success: response.status === 'cancelled',
        providerTransactionId: response.id?.toString() || '',
        status: this.statusMapper.mapToInternalStatus(
          response.status as string,
        ),
      };
    } catch (error) {
      this.logger.error(
        `MP cancel failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack error found',
      );

      // Si el error es "payment not found" o "already processed", considerarlo éxito
      const errorMessage = error instanceof Error ? error.message : '';
      if (
        errorMessage.includes('not_found') ||
        errorMessage.includes('already_processed')
      ) {
        return {
          success: true,
          providerTransactionId,
          status: PaymentStatus.FAILED,
          error: 'Payment already processed or not found',
        };
      }

      return {
        success: false,
        providerTransactionId,
        status: PaymentStatus.PENDING, // Mantener estado si no se pudo cancelar
        error:
          error instanceof Error
            ? `MercadoPago cancel error: ${error.message}`
            : 'Unknown cancel error',
      };
    }
  }

  async refundPayment(
    providerTransactionId: string,
    amountCents?: number,
  ): Promise<PaymentResult> {
    try {
      this.logger.debug(
        `Refunding payment ${providerTransactionId}, amount: ${amountCents}`,
      );

      // First, get the current payment status
      const currentStatus = await this.getPaymentStatus(providerTransactionId);

      if (currentStatus.status !== PaymentStatus.SUCCEEDED) {
        throw new Error(
          `Cannot refund payment with status: ${currentStatus.status}`,
        );
      }

      const refundResult = await this.refundService.createRefund({
        payment_id: parseInt(providerTransactionId),
        amount: amountCents ? amountCents / 100 : undefined, // Convert cents to MercadoPago amount
      });

      // Return simple PaymentResult
      return {
        success: refundResult.status === 'approved',
        providerTransactionId,
        status:
          refundResult.status === 'approved'
            ? PaymentStatus.SUCCEEDED
            : PaymentStatus.FAILED,
      };
    } catch (error) {
      this.logger.error(
        `Error refunding payment ${providerTransactionId}:`,
        error,
      );
      return {
        success: false,
        providerTransactionId,
        status: PaymentStatus.FAILED,
        error: `Refund failed: ${error}`,
      };
    }
  }

  // Método para manejar webhooks de MercadoPago
  async handleWebhook(webhookData: {
    id?: string;
    live_mode?: boolean;
    type?: string;
    date_created?: string;
    application_id?: string;
    user_id?: string;
    version?: string;
    api_version?: string;
    action?: string;
    data?: {
      id?: string;
    };
  }): Promise<PaymentResult | null> {
    return this.webhookHandler.handleWebhook(webhookData);
  }

  // Método para verificar la firma del webhook (seguridad)
  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    return this.webhookHandler.verifyWebhookSignature(
      payload,
      signature,
      secret,
    );
  }

  async processPayment(request: PaymentRequest): Promise<PaymentResult> {
    try {
      this.logger.debug('Processing payment:', request);

      const paymentData = {
        description:
          request.description || `Pago para pedido #${request.orderId}`,
        installments: 1,
        payer: {
          email: 'test@example.com', // Default for testing
          first_name: 'Test',
          last_name: 'User',
          phone: {
            area_code: '11',
            number: '1234567890',
          },
          identification: {
            type: 'DNI',
            number: '12345678',
          },
        },
        payment_method_id: this.statusMapper.mapPaymentMethod(request.method),
        transaction_amount: request.amountCents / 100, // Convert cents to amount
        external_reference: request.orderId.toString(),
        metadata: {
          order_id: request.orderId,
          request_id: request.id,
        },
      };

      const response = await this.payment.create({ body: paymentData });
      this.logger.debug('Payment created:', response);

      return {
        success: this.statusMapper.isSuccessStatus(response.status),
        providerTransactionId: response.id?.toString() || '',
        status: this.statusMapper.mapToInternalStatus(
          response.status as string,
        ),
        error:
          response.status === 'rejected'
            ? response.status_detail || 'Payment rejected'
            : undefined,
      };
    } catch (error) {
      this.logger.error('Error processing payment:', error);

      // Si es un error de MercadoPago, extraer información útil
      if (error && typeof error === 'object' && 'body' in error) {
        const mpError = error as {
          body?: { message?: string; cause?: unknown };
        };
        let errorMessage = 'Payment processing failed';

        if (mpError.body?.message) {
          errorMessage = mpError.body.message;
        } else if (
          Array.isArray(mpError.body?.cause) &&
          mpError.body.cause.length > 0
        ) {
          const firstCause = mpError.body.cause[0] as unknown;
          if (
            firstCause &&
            typeof firstCause === 'object' &&
            'description' in firstCause
          ) {
            errorMessage = String(firstCause.description);
          }
        }

        return {
          success: false,
          providerTransactionId: '',
          status: PaymentStatus.FAILED,
          error: errorMessage,
        };
      }

      return {
        success: false,
        providerTransactionId: '',
        status: PaymentStatus.FAILED,
        error: 'Payment processing failed',
      };
    }
  }
}
