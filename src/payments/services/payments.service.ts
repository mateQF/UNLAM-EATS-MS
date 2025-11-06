import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '../dto/pagination.dto';
import {
  PAYMENTS_REPOSITORY,
  type IPaymentsRepository,
} from '../repositories/payments.repository.interface';
import {
  PAYMENT_PROVIDER_SERVICE_TOKEN,
  PaymentProviderService,
} from '../provider/payment-provider.interface';
import { MercadoPagoWebhookHandler } from '../provider/services/mercadopago-webhook-handler.service';
import {
  WEBHOOK_HANDLER_TOKEN,
  WebhookData,
} from '../provider/interfaces/webhook-handler.interface';
import { Payment, Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: IPaymentsRepository,
    @Inject(PAYMENT_PROVIDER_SERVICE_TOKEN)
    private readonly paymentProvider: PaymentProviderService,
    @Inject(WEBHOOK_HANDLER_TOKEN)
    private readonly webhookHandler: MercadoPagoWebhookHandler,
  ) {}

  async createPayment(createDto: CreatePaymentDto, idempotencyKey?: string) {
    if (idempotencyKey) {
      const existing =
        await this.paymentsRepository.findByIdempotencyKey(idempotencyKey);
      if (existing) {
        return existing;
      }
    }

    try {
      const created = await this.paymentsRepository.create(
        createDto,
        idempotencyKey,
      );
      return created;
    } catch (err: any) {
      if (
        err instanceof Prisma.PrismaClientKnownRequestError &&
        err.code === 'P2002'
      ) {
        const existing = await this.paymentsRepository.findByIdempotencyKey(
          idempotencyKey!,
        );
        if (existing) return existing;
        throw new ConflictException('Idempotency key conflict');
      }
      throw err;
    }
  }

  async initiateCheckout(paymentId: number) {
    const payment = await this.paymentsRepository.findById(paymentId);
    if (!payment)
      throw new NotFoundException(`Payment with ID ${paymentId} not found`);

    if (payment.status !== 'pending')
      throw new BadRequestException('Payment not in pending state');

    const items = [
      {
        title: payment.description ?? `Order ${payment.orderId}`,
        unit_price: payment.amountCents / 100,
        quantity: 1,
        currency: payment.currency,
      },
    ];

    const pref = await this.paymentProvider.createPreference(
      items,
      payment.id.toString(),
    );

    await this.paymentsRepository.updatePaymentData(payment.id, {
      providerRef: pref.id,
      status: 'processing',
    });

    return {
      preferenceId: pref.id,
      initPoint: pref.initPoint,
      sandboxInitPoint: pref.sandboxInitPoint,
    };
  }

  async handleProviderWebhook(webhookData: WebhookData) {
    const result = await this.webhookHandler.handleWebhook(webhookData);
    if (!result) return null;

    let payment: Payment | null = null;

    if (result.providerTransactionId) {
      const byRef = await this.paymentsRepository.findByProviderRef(
        result.providerTransactionId,
      );

      if (byRef.length === 0) {
        throw new NotFoundException(
          `Payment with provider reference ${result.providerTransactionId} not found`,
        );
      }

      payment = Array.isArray(byRef) ? byRef[0] : byRef;
    }

    if (!payment) {
      throw new NotFoundException('Payment not found for webhook processing');
    }

    if (payment.status === result.status) {
      return payment;
    }

    const updated = await this.paymentsRepository.updatePaymentData(
      payment.id,
      {
        status: result.status,
        providerRef: result.providerTransactionId ?? payment.providerRef,
      },
    );

    return updated;
  }

  async getPaymentsByProviderRef(providerRef: string) {
    return await this.paymentsRepository.findByProviderRef(providerRef);
  }

  async getPaymentById(id: number) {
    return await this.paymentsRepository.findById(id);
  }

  async getPaymentsByUserId(userId: number, pagination: PaginationDto) {
    return await this.paymentsRepository.findByUserId(userId, pagination);
  }

  async getPaymentsByOrderId(orderId: number) {
    return await this.paymentsRepository.findByOrderId(orderId);
  }

  async getPaymentsByStatus(status: string, pagination: PaginationDto) {
    return await this.paymentsRepository.findByStatus(status, pagination);
  }
}
