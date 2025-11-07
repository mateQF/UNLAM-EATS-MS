import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { HealthModule } from './health/health.module';
import { RedisModule } from './database/redis/redis.module';
import { envValidationSchema } from './config/env.config';
import { WebhooksModule } from './webhooks/webhooks.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: envValidationSchema,
    }),
    PaymentsModule,
    PrismaModule,
    HealthModule,
    RedisModule,
    WebhooksModule,
  ],
  providers: [JwtService],
  controllers: [],
})
export class AppModule {}
