import 'reflect-metadata';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { RedisLockService } from '../src/modules/wallets/redis-lock';
import { SYNC_JOB_NAMES, SYNC_QUEUE } from '../src/modules/wallets/sync.types';

describe('wallet synchronization primitives', () => {
  it('defines one queue and all requested idempotent job names', () => {
    assert.equal(SYNC_QUEUE, 'account-sync');
    assert.deepEqual(Object.values(SYNC_JOB_NAMES), [
      'sync-account',
      'sync-balances',
      'sync-transactions',
      'sync-token-balances',
      'sync-protocol-positions',
    ]);
  });

  it('does not run a second task while a Redis lock is held', async () => {
    const values = new Map<string, string>();
    const redis = {
      async set(key: string, value: string) {
        if (values.has(key)) return null;
        values.set(key, value);
        return 'OK';
      },
      async eval() {
        return values.delete('sfo:lock:account');
      },
    };
    const locks = new RedisLockService(redis as never);
    const first = await locks.withLock('account', async () => 'first');
    assert.equal(first, 'first');
    values.set('sfo:lock:account', 'held');
    assert.equal(await locks.withLock('account', async () => 'second'), null);
  });
});
