import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { IRefundService } from '../interfaces/refund-service.interface';

@Injectable()
export class MercadoPagoRefundService implements IRefundService {
  private readonly logger = new Logger(MercadoPagoRefundService.name);

  constructor(private readonly configService: ConfigService) {}

  async createRefund(refundData: {
    payment_id: number;
    amount?: number;
  }): Promise<{
    id: string;
    status: string;
    amount?: number;
  }> {
    const accessToken = this.configService.get<string>(
      'MERCADOPAGO_ACCESS_TOKEN',
    );
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const baseUrl = isProduction
      ? 'https://api.mercadopago.com'
      : 'https://api.mercadopago.com';

    const requestBody: { amount?: number } = {};
    if (refundData.amount) {
      requestBody.amount = refundData.amount;
    }

    const response = await fetch(
      `${baseUrl}/v1/payments/${refundData.payment_id}/refunds`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      },
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(
        `MercadoPago refund API error: ${response.status} - ${errorText}`,
      );
    }

    const result = (await response.json()) as {
      id: string;
      status: string;
      amount?: number;
    };

    return result;
  }
}
