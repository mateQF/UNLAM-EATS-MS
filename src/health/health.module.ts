import { Module } from '@nestjs/common';
import { RedisModule } from 'src/database/redis/redis.module';
import { HealthService } from './health.service';
import { HealthController } from './health.controller';

@Module({
  imports: [RedisModule],
  providers: [HealthService],
  controllers: [HealthController],
})
export class HealthModule {}
