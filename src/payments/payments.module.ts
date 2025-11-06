import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { JwtService } from '@nestjs/jwt';
import { PrismaPaymentsRepository } from './repositories/prisma-payments.repository';
import { MercadoPagoProvider } from './provider/mercadopago.provider';
import { MercadoPagoStatusMapper } from './provider/services/mercadopago-status-mapper.service';
import { MercadoPagoWebhookHandler } from './provider/services/mercadopago-webhook-handler.service';
import { MercadoPagoRefundService } from './provider/services/mercadopago-refund.service';
import { PaymentProviderService } from './provider/payment-provider.interface';
import { PAYMENTS_REPOSITORY } from './repositories/payments.repository.interface';
import { STATUS_MAPPER_TOKEN } from './provider/interfaces/status-mapper.interface';
import { WEBHOOK_HANDLER_TOKEN } from './provider/interfaces/webhook-handler.interface';
import { REFUND_SERVICE_TOKEN } from './provider/interfaces/refund-service.interface';

@Module({
  providers: [
    PaymentsService,
    JwtService,
    {
      provide: PAYMENTS_REPOSITORY,
      useClass: PrismaPaymentsRepository,
    },
    {
      provide: PaymentProviderService,
      useClass: MercadoPagoProvider,
    },
    {
      provide: STATUS_MAPPER_TOKEN,
      useClass: MercadoPagoStatusMapper,
    },
    {
      provide: WEBHOOK_HANDLER_TOKEN,
      useClass: MercadoPagoWebhookHandler,
    },
    {
      provide: REFUND_SERVICE_TOKEN,
      useClass: MercadoPagoRefundService,
    },
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
