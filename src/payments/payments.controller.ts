import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaymentsService } from './payments.service';
import { AuthGuard } from './guards/jwt.guard';
import { PaginationDto } from './dto/pagination.dto';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { type PaymentRequest } from './provider/payment-provider.interface';

@ApiTags('Payments')
@Controller('payments')
@UseGuards(AuthGuard)
@ApiBearerAuth('JWT-auth')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // TODO: define personalized decorators for common responses (swagger)
  @Post()
  // @ApiOperation({
  //   summary: 'Crear nuevo pago',
  //   description: 'Crea un nuevo pago en el sistema',
  // })
  // @ApiHeader({
  //   name: 'idempotency-key',
  //   description: 'Clave de idempotencia para evitar pagos duplicados',
  //   required: false,
  // })
  // @ApiResponse({
  //   status: 201,
  //   description: 'Pago creado exitosamente',
  //   type: PaymentResponseDto,
  // })
  // @ApiResponse({
  //   status: 400,
  //   description: 'Datos inválidos',
  // })
  // @ApiResponse({
  //   status: 409,
  //   description: 'Pago duplicado (idempotency key)',
  // })
  createPayment(
    @Body() paymentDto: CreatePaymentDto,
    @Headers('idempotency-key') idempotencyKey: string,
  ) {
    return this.paymentsService.createPayment(paymentDto, idempotencyKey);
  }

  @Post('/process')
  processPayment(@Body() data: PaymentRequest) {
    return this.paymentsService.processPayment(data);
  }

  // @Post(':id/retry')
  // retryPayment(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.paymentsService.retryPayment(id);
  // }

  // @Post(':id/cancel')
  // cancelPayment(@Param('id', ParseUUIDPipe) id: string) {
  //   return this.paymentsService.cancelPayment(id);
  // }

  @Get('/users/:userId')
  getPaymentsByUserId(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByUserId(userId, pagination);
  }

  @Get('/orders/:orderId')
  getPaymentsByOrderId(@Param('orderId', ParseUUIDPipe) orderId: string) {
    return this.paymentsService.getPaymentsByOrderId(orderId);
  }

  @Get('/status/:status')
  getPaymentsByStatus(
    @Param('status') status: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByStatus(status, pagination);
  }

  @Get('/search')
  searchPayments(
    @Query('userId') userId?: string,
    @Query('orderId') orderId?: string,
    @Query('status') status?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query() pagination?: PaginationDto,
  ) {
    const filters = { userId, orderId, status, from, to };
    const cleanPagination = {
      page: pagination?.page,
      limit: pagination?.limit,
    };
    return this.paymentsService.searchPayments(filters, cleanPagination);
  }

  @Get('/provider/:providerRef')
  getPaymentsByProviderRef(
    @Param('providerRef') providerRef: string,
    @Query() pagination: PaginationDto,
  ) {
    return this.paymentsService.getPaymentsByProviderRef(
      providerRef,
      pagination,
    );
  }

  @Get(':id')
  getPaymentById(@Param('id', ParseUUIDPipe) id: string) {
    return this.paymentsService.getPaymentById(id);
  }
}
