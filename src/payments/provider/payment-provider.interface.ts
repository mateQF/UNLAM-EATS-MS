import { PaymentStatus } from 'src/common/enums/payment-status.enum';
import { PreferenceResponse } from 'mercadopago/dist/clients/preference/commonTypes';

export type MercadoPagoPaymentResponse = {
  id: string;
  initPoint?: string;
  sandboxInitPoint: string | undefined;
  raw: PreferenceResponse;
};

export interface PaymentRequest {
  id: string;
  amountCents: number;
  currency: string;
  method: string;
  orderId: string;
  description?: string;
}

export interface PaymentResult {
  success: boolean;
  providerTransactionId: string;
  status: PaymentStatus;
  error?: string;
}

export abstract class PaymentProviderService {
  abstract getPaymentStatus(providerRef: string): Promise<PaymentResult>;
  abstract createPreference(
    items: {
      title: string;
      unit_price: number;
      quantity?: number;
      currency?: string;
    }[],
    externalReference: string,
  ): Promise<MercadoPagoPaymentResponse>;
}

export const PAYMENT_PROVIDER_SERVICE_TOKEN = Symbol('PaymentProviderService');
