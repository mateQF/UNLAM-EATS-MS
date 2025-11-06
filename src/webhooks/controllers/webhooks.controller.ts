import {
  Controller,
  Post,
  Req,
  Headers,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { type Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { PaymentsService } from 'src/payments/services/payments.service';
import { MercadoPagoWebhookHandler } from 'src/payments/provider/services/mercadopago-webhook-handler.service';

@Controller('webhooks')
export class WebhooksController {
  constructor(
    private readonly paymentsService: PaymentsService,
    private readonly webhookHandler: MercadoPagoWebhookHandler,
    private readonly config: ConfigService,
  ) {}

  @Post('mercadopago')
  @HttpCode(200)
  async handle(
    @Req() req: Request & { rawBody?: string },
    @Headers('x-hub-signature') signature?: string,
  ) {
    const raw = req.rawBody ?? JSON.stringify(req.body);
    const secret = this.config.get<string>('MERCADOPAGO_WEBHOOK_SECRET') ?? '';
    if (
      !this.webhookHandler.verifyWebhookSignature(raw, signature ?? '', secret)
    ) {
      throw new BadRequestException('Invalid signature');
    }

    let webhookData: unknown;
    try {
      webhookData = raw ? JSON.parse(raw) : req.body;
    } catch {
      throw new BadRequestException('Invalid JSON payload');
    }

    if (!webhookData || typeof webhookData !== 'object') {
      throw new BadRequestException('Invalid webhook payload');
    }
    await this.paymentsService.handleProviderWebhook(webhookData);
    return { ok: true };
  }
}
