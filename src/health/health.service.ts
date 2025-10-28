import { Injectable } from '@nestjs/common';
import { PrismaService } from '../database/prisma/prisma.service';
import { RedisService } from 'src/database/redis/redis.service';

@Injectable()
export class HealthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  async getHealthStatus() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
      this.checkMemory(),
    ]);

    const allHealthy = checks.every(
      (check) => check.status === 'fulfilled' && check.value.healthy,
    );

    return {
      status: allHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'payments-microservice',
      version: process.env.npm_package_version || '1.0.0',
      checks: {
        database:
          checks[0].status === 'fulfilled'
            ? checks[0].value
            : { healthy: false },
        redis:
          checks[1].status === 'fulfilled'
            ? checks[1].value
            : { healthy: false },
        memory:
          checks[2].status === 'fulfilled'
            ? checks[2].value
            : { healthy: false },
      },
      uptime: process.uptime(),
    };
  }

  private async checkDatabase() {
    try {
      const start = Date.now();
      await this.prisma.$queryRaw`SELECT 1`;
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency: `${latency}ms`,
        connection: 'active',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connection: 'failed',
      };
    }
  }

  private async checkRedis() {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;

      return {
        healthy: true,
        latency: `${latency}ms`,
        connection: 'active',
      };
    } catch (error) {
      return {
        healthy: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        connection: 'failed',
      };
    }
  }

  private checkMemory() {
    const usage = process.memoryUsage();
    const totalMB = Math.round(usage.rss / 1024 / 1024);

    return {
      healthy: totalMB < 512,
      usage: `${totalMB}MB`,
      heap: `${Math.round(usage.heapUsed / 1024 / 1024)}MB`,
      limit: '512MB',
    };
  }
}
