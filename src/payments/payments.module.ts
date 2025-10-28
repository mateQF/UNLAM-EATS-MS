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

@Module({
  providers: [
    PaymentsService,
    JwtService,
    {
      provide: 'IPaymentsRepository',
      useClass: PrismaPaymentsRepository,
    },
    {
      provide: PaymentProviderService,
      useClass: MercadoPagoProvider,
    },
    {
      provide: 'IStatusMapper',
      useClass: MercadoPagoStatusMapper,
    },
    {
      provide: 'IWebhookHandler',
      useClass: MercadoPagoWebhookHandler,
    },
    {
      provide: 'IRefundService',
      useClass: MercadoPagoRefundService,
    },
  ],
  controllers: [PaymentsController],
})
export class PaymentsModule {}
