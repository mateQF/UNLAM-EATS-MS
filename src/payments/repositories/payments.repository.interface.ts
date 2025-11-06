import { Payment, PaymentStatus } from '@prisma/client';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '../dto/pagination.dto';

export interface IPaymentsRepository {
  create(data: CreatePaymentDto, idempotencyKey?: string): Promise<Payment>;
  findById(id: number): Promise<Payment | null>;
  findByOrderId(orderId: number): Promise<Payment[]>;
  findByUserId(userId: number, pagination: PaginationDto): Promise<Payment[]>;
  updateStatus(
    id: number,
    status: string,
    providerRef?: string,
  ): Promise<Payment>;
  findByStatus(status: string, pagination: PaginationDto): Promise<Payment[]>;
  findByProviderRef(providerRef: string): Promise<Payment[]>;
  updatePaymentData(
    paymentId: number,
    { providerRef, status }: { providerRef: string; status: PaymentStatus },
  ): Promise<Payment>;
  updateProviderRef(id: number, providerRef: string): Promise<Payment>;
  findByIdempotencyKey(key: string): Promise<Payment | null>;
}

export const PAYMENTS_REPOSITORY = Symbol('PAYMENTS_REPOSITORY');
