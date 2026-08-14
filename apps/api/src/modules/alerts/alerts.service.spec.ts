import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { AlertsService } from './alerts.service';

describe('AlertsService', () => {
  it('deduplicates matching notifications during the cooldown window', async () => {
    const rule = {
      id: 'rule-1',
      userId: 'user-1',
      type: 'price_threshold',
      conditions: { threshold: '10', direction: 'above' },
      enabled: true,
      cooldownSeconds: 3600,
      dedupeKey: null,
      lastTriggeredAt: null,
    };
    const notifications: Record<string, unknown>[] = [];
    const rules = {
      findOne: async () => rule,
      save: async (value: Record<string, unknown>) => value,
      find: async () => [],
      create: (value: Record<string, unknown>) => value,
      remove: async () => undefined,
    };
    const notificationRepo = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        notifications.push(value);
        return { id: `notification-${notifications.length}`, ...value };
      },
    };
    const queue = { add: async () => undefined };
    const service = new AlertsService(rules as never, notificationRepo as never, queue as never);
    const job = {
      userId: 'user-1',
      ruleId: 'rule-1',
      observation: { value: '10.5', eventKey: 'price:asset-1' },
    };
    assert.equal((await service.evaluate(job)).triggered, true);
    assert.equal((await service.evaluate(job)).reason, 'cooldown');
    assert.equal(notifications.length, 1);
  });
});
