export interface IRefundService {
  createRefund(refundData: { payment_id: number; amount?: number }): Promise<{
    id: string;
    status: string;
    amount?: number;
  }>;
}

export const REFUND_SERVICE_TOKEN = Symbol('IRefundService');
