import { Payment } from '@prisma/client';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { PaginationDto } from '../dto/pagination.dto';

export interface IPaymentsRepository {
  create(data: CreatePaymentDto, idempotencyKey?: string): Promise<Payment>;
  findById(id: string): Promise<Payment | null>;
  findByOrderId(orderId: string): Promise<Payment[]>;
  findByUserId(userId: string, pagination: PaginationDto): Promise<Payment[]>;
  updateStatus(
    id: string,
    status: string,
    providerRef?: string,
  ): Promise<Payment>;
  findByStatus(status: string, pagination: PaginationDto): Promise<Payment[]>;
  findByProviderRef(
    providerRef: string,
    pagination: PaginationDto,
  ): Promise<Payment[]>;
  findByFilters(
    filters: {
      userId?: string;
      orderId?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationDto,
  ): Promise<Payment[]>;
}

export const PAYMENTS_REPOSITORY = Symbol('PAYMENTS_REPOSITORY');
