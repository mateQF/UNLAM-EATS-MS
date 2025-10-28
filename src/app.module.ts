import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PaymentsModule } from './payments/payments.module';
import { PrismaModule } from './database/prisma/prisma.module';
import { JwtService } from '@nestjs/jwt';
import { HealthModule } from './health/health.module';
import { RedisModule } from './database/redis/redis.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PaymentsModule,
    PrismaModule,
    HealthModule,
    RedisModule,
  ],
  providers: [JwtService],
  controllers: [],
})
export class AppModule {}
