import { Inject, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import Redis from 'ioredis';
import { REDIS } from '../infrastructure/redis.module';

@Injectable()
export class HealthService {
  constructor(
    private readonly dataSource: DataSource,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async readiness() {
    const checks: Record<string, 'up' | 'down'> = { database: 'down', redis: 'down' };
    try {
      await this.dataSource.query('SELECT 1');
      checks.database = 'up';
    } catch {
      /* normalized below */
    }
    try {
      await this.redis.ping();
      checks.redis = 'up';
    } catch {
      /* normalized below */
    }
    const ready = Object.values(checks).every((value) => value === 'up');
    return { status: ready ? 'ok' : 'not_ready', checks };
  }
}
