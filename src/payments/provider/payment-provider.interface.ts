import { PaymentStatus } from 'src/common/enums/payment-status.enum';

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
  abstract processPayment(request: PaymentRequest): Promise<PaymentResult>;
  abstract getPaymentStatus(providerRef: string): Promise<PaymentResult>;
  abstract retryPayment(
    originalProviderRef: string,
    newRequest: PaymentRequest,
  ): Promise<PaymentResult>;
  abstract cancelPayment(providerTransactionId: string): Promise<PaymentResult>;
  abstract refundPayment(
    providerTransactionId: string,
    amountCents?: number,
  ): Promise<PaymentResult>;
}
