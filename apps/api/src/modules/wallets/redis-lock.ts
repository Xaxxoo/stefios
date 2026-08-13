import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { randomUUID } from 'node:crypto';
import { REDIS } from '../../infrastructure/redis.module';

@Injectable()
export class RedisLockService {
  constructor(@Inject(REDIS) private readonly redis: Redis) {}

  async withLock<T>(key: string, task: () => Promise<T>, ttlMs = 60_000): Promise<T | null> {
    const token = randomUUID();
    const acquired = await this.redis.set(`sfo:lock:${key}`, token, 'PX', ttlMs, 'NX');
    if (acquired !== 'OK') return null;
    try {
      return await task();
    } finally {
      const release =
        "if redis.call('get', KEYS[1]) == ARGV[1] then return redis.call('del', KEYS[1]) else return 0 end";
      await this.redis.eval(release, 1, `sfo:lock:${key}`, token);
    }
  }
}
