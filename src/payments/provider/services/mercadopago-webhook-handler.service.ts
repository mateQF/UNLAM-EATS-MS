import { Injectable, Logger } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import { createHmac } from 'crypto';
import {
  IWebhookHandler,
  WebhookData,
} from '../interfaces/webhook-handler.interface';
import { PaymentResult } from '../payment-provider.interface';
import { PaymentProviderService } from '../payment-provider.interface';

@Injectable()
export class MercadoPagoWebhookHandler implements IWebhookHandler {
  private readonly logger = new Logger(MercadoPagoWebhookHandler.name);
  private paymentProvider!: PaymentProviderService;

  constructor(private readonly moduleRef: ModuleRef) {}

  onModuleInit() {
    this.paymentProvider = this.moduleRef.get(PaymentProviderService, {
      strict: false,
    });
  }

  async handleWebhook(webhookData: WebhookData): Promise<PaymentResult | null> {
    try {
      this.logger.log(`Handling MP webhook: ${JSON.stringify(webhookData)}`);

      if (webhookData.type !== 'payment') {
        this.logger.log(`Webhook type ${webhookData.type} ignored`);
        return null;
      }

      const paymentId = webhookData.data?.id;
      if (!paymentId) {
        this.logger.error('Webhook without payment ID');
        return null;
      }

      return await this.paymentProvider.getPaymentStatus(paymentId);
    } catch (error) {
      this.logger.error(
        `MP webhook handling failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        error instanceof Error ? error.stack : 'No stack error found',
      );
      return null;
    }
  }

  verifyWebhookSignature(
    payload: string,
    signature: string,
    secret: string,
  ): boolean {
    try {
      const expectedSignature = createHmac('sha256', secret)
        .update(payload)
        .digest('hex');

      return signature === expectedSignature;
    } catch (error) {
      this.logger.error(
        `Webhook signature verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      return false;
    }
  }
}
