import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService
  extends Redis
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(RedisService.name);

  constructor(protected readonly appConfig: ConfigService) {
    super({
      host: appConfig.get<string>('REDIS_HOST', '127.0.0.1'),
      port: appConfig.get<number>('REDIS_PORT', 6379),
      password: appConfig.get<string | undefined>('REDIS_PASSWORD'),
      lazyConnect: true,
      maxRetriesPerRequest: 2,
      retryStrategy: (times) => Math.min(times * 1000, 5000),
    });
  }

  async ping(): Promise<'PONG'> {
    return await super.ping();
  }

  onModuleInit() {
    this.logger.log('Redis client initialized (lazy connect)');
  }

  onModuleDestroy() {
    try {
      this.disconnect();
      this.logger.log('✅ Redis disconnected successfully');
    } catch (error) {
      this.logger.error('❌ Redis disconnection failed', error);
    }
  }
}
