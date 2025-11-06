import { Injectable, Logger, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MercadoPagoConfig, Payment, Preference } from 'mercadopago';
import {
  MercadoPagoPaymentResponse,
  PaymentProviderService,
  PaymentRequest,
  PaymentResult,
} from './payment-provider.interface';
import {
  STATUS_MAPPER_TOKEN,
  type IStatusMapper,
} from './interfaces/status-mapper.interface';
import {
  WEBHOOK_HANDLER_TOKEN,
  type IWebhookHandler,
} from './interfaces/webhook-handler.interface';
import { PreferenceRequest } from 'mercadopago/dist/clients/preference/commonTypes';

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

  // id preference: 787997534-6dad21a1-6145-4f0d-ac21-66bf7a5e7a58
  async createPreference(
    items: {
      title: string;
      unit_price: number;
      quantity?: number;
      currency?: string;
    }[],
    externalReference: string,
  ): Promise<MercadoPagoPaymentResponse> {
    const baseUrl =
      this.configService.get<string>('APP_URL') || 'http://localhost:3000';
    const pref = new Preference(this.mercadopago);

    const sdkItems = items.map((it, idx) => ({
      id: `${externalReference}-${idx + 1}`,
      title: it.title,
      quantity: it.quantity ?? 1,
      unit_price: it.unit_price,
      currency_id: it.currency ?? 'ARS',
    }));

    const body: PreferenceRequest = {
      items: sdkItems,
      external_reference: externalReference,
      back_urls: {
        success: `${baseUrl}/payments/return/success`,
        failure: `${baseUrl}/payments/return/failure`,
        pending: `${baseUrl}/payments/return/pending`,
      },
      notification_url: `${baseUrl}/webhooks/mercadopago`,
      auto_return: 'approved',
    };

    const response = await pref.create({ body });

    return {
      id: response.id?.toString() || '',
      initPoint: response.init_point,
      sandboxInitPoint: response.sandbox_init_point,
      raw: response,
    };
  }
}
