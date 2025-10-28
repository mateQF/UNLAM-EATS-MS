import { Injectable } from '@nestjs/common';
import { IPaymentsRepository } from './payments.repository.interface';
import { CreatePaymentDto } from '../dto/create-payment.dto';
import { Payment, PaymentStatus } from '@prisma/client';
import { PrismaService } from 'src/database/prisma/prisma.service';
import { PaginationDto } from '../dto/pagination.dto';

@Injectable()
export class PrismaPaymentsRepository implements IPaymentsRepository {
  constructor(private readonly prismaService: PrismaService) {}

  private getPaginationParams(pagination: PaginationDto) {
    const page = pagination.page || 1;
    const limit = pagination.limit || 10;
    const skip = (page - 1) * limit;
    const take = limit;

    return { skip, take };
  }

  create(data: CreatePaymentDto, idempotencyKey?: string): Promise<Payment> {
    return this.prismaService.payment.create({
      data: {
        userId: data.userId,
        orderId: data.orderId,
        amountCents: data.amountCents,
        currency: data.currency,
        method: data.method,
        description: data.description,
        status: 'pending',
        provider: data.provider,
        idempotencyKey: idempotencyKey,
      },
    });
  }

  findById(id: string): Promise<Payment | null> {
    return this.prismaService.payment.findUnique({
      where: { id },
    });
  }

  findByOrderId(orderId: string): Promise<Payment[]> {
    return this.prismaService.payment.findMany({
      where: { orderId },
    });
  }

  findByUserId(userId: string, pagination: PaginationDto): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { userId },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  updateStatus(
    id: string,
    status: PaymentStatus,
    providerRef?: string,
  ): Promise<Payment> {
    return this.prismaService.payment.update({
      where: { id },
      data: {
        status,
        providerRef,
      },
    });
  }

  findByStatus(
    status: PaymentStatus,
    pagination: PaginationDto,
  ): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { status },
      skip,
      take,
    });
  }

  findByProviderRef(
    providerRef: string,
    pagination: PaginationDto,
  ): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { providerRef },
      skip,
      take,
    });
  }

  findByFilters(
    filters: Partial<Omit<Payment, 'id' | 'createdAt' | 'updatedAt'>>,
    pagination: PaginationDto,
  ): Promise<Payment[]> {
    const { skip, take } = this.getPaginationParams(pagination);
    return this.prismaService.payment.findMany({
      where: { ...filters },
      skip,
      take,
    });
  }
}
