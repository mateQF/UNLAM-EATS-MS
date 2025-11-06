import { Inject, Injectable } from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationDto } from './dto/pagination.dto';
import {
  PAYMENTS_REPOSITORY,
  type IPaymentsRepository,
} from './repositories/payments.repository.interface';
import {
  PaymentProviderService,
  PaymentRequest,
} from './provider/payment-provider.interface';
import { Payment } from '@prisma/client';

@Injectable()
export class PaymentsService {
  constructor(
    @Inject(PAYMENTS_REPOSITORY)
    private readonly paymentsRepository: IPaymentsRepository,
    private readonly paymentProvider: PaymentProviderService,
  ) {}

  async createPayment(payment: CreatePaymentDto, idempotencyKey?: string) {
    await this.paymentsRepository.create(payment, idempotencyKey);
  }

  async processPayment(data: PaymentRequest) {
    await this.paymentProvider.processPayment(data);
  }

  async retryPayment(id: string, data: PaymentRequest) {
    const { providerRef } = (await this.paymentsRepository.findById(
      id,
    )) as Payment;

    if (!providerRef) {
      throw new Error('No provider reference found for this payment');
    }

    await this.paymentProvider.retryPayment(providerRef, data);
  }

  async getPaymentById(id: string) {
    return await this.paymentsRepository.findById(id);
  }

  async searchPayments(
    filters: {
      userId?: string;
      orderId?: string;
      status?: string;
      from?: string;
      to?: string;
    },
    pagination: PaginationDto,
  ) {
    return await this.paymentsRepository.findByFilters(filters, pagination);
  }

  async getPaymentsByUserId(userId: string, pagination: PaginationDto) {
    return await this.paymentsRepository.findByUserId(userId, pagination);
  }

  async getPaymentsByOrderId(orderId: string) {
    return await this.paymentsRepository.findByOrderId(orderId);
  }

  async getPaymentsByStatus(status: string, pagination: PaginationDto) {
    return await this.paymentsRepository.findByStatus(status, pagination);
  }

  // async handleProviderWebhook(webhookData: any) {}

  async getPaymentsByProviderRef(
    providerRef: string,
    pagination: PaginationDto,
  ) {
    return await this.paymentsRepository.findByProviderRef(
      providerRef,
      pagination,
    );
  }
}
