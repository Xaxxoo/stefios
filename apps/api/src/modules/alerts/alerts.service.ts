import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { InjectRepository } from '@nestjs/typeorm';
import type { Queue } from 'bullmq';
import type { Repository } from 'typeorm';
import { AlertRule, Notification } from '../../database/entities';
import { ALERT_QUEUE, type AlertJob, type AlertObservation } from './alerts.types';

export const ALERT_TYPES = [
  'price_threshold',
  'yield_threshold',
  'health_deterioration',
  'liquidation_risk',
  'concentration_threshold',
  'cross_chain_completed',
  'cross_chain_failed',
  'anchor_transaction_change',
] as const;

@Injectable()
export class AlertsService {
  constructor(
    @InjectRepository(AlertRule) private readonly rules: Repository<AlertRule>,
    @InjectRepository(Notification) private readonly notifications: Repository<Notification>,
    @InjectQueue(ALERT_QUEUE) private readonly queue: Queue,
  ) {}

  list(userId: string) {
    return this.rules.find({ where: { userId }, order: { createdAt: 'DESC' } });
  }

  async create(
    userId: string,
    type: string,
    conditions: Record<string, unknown>,
    cooldownSeconds = 3600,
  ) {
    if (!ALERT_TYPES.includes(type as (typeof ALERT_TYPES)[number]))
      throw new BadRequestException('Unsupported alert type');
    if (!Number.isInteger(cooldownSeconds) || cooldownSeconds < 0 || cooldownSeconds > 2_592_000)
      throw new BadRequestException('Cooldown must be between 0 and 2592000 seconds');
    return this.rules.save(
      this.rules.create({
        userId,
        type,
        conditions,
        enabled: true,
        cooldownSeconds,
        dedupeKey: null,
        lastTriggeredAt: null,
      }),
    );
  }

  async update(
    userId: string,
    id: string,
    patch: { enabled?: boolean; conditions?: Record<string, unknown>; cooldownSeconds?: number },
  ) {
    const rule = await this.rule(userId, id);
    if (patch.enabled !== undefined) rule.enabled = patch.enabled;
    if (patch.conditions) rule.conditions = patch.conditions;
    if (patch.cooldownSeconds !== undefined) rule.cooldownSeconds = patch.cooldownSeconds;
    return this.rules.save(rule);
  }

  async remove(userId: string, id: string) {
    const rule = await this.rule(userId, id);
    await this.rules.remove(rule);
    return { ok: true };
  }

  async enqueue(userId: string, ruleId: string, observation?: AlertObservation) {
    const jobId = `alert:${ruleId}:${observation?.eventKey ?? 'snapshot'}`.slice(0, 200);
    await this.queue.add('evaluate', { userId, ruleId, observation } satisfies AlertJob, {
      jobId,
      removeOnComplete: 100,
      removeOnFail: 100,
    });
    return { jobId, status: 'queued' };
  }

  async evaluate(job: AlertJob) {
    const rule = await this.rule(job.userId, job.ruleId);
    if (!rule.enabled || !matches(rule.type, rule.conditions ?? {}, job.observation))
      return { triggered: false, reason: 'not_matched' };
    const dedupeKey =
      `${rule.type}:${job.observation?.eventKey ?? job.observation?.targetRef ?? JSON.stringify(rule.conditions ?? {})}`.slice(
        0,
        255,
      );
    if (
      rule.lastTriggeredAt &&
      Date.now() - rule.lastTriggeredAt.getTime() < rule.cooldownSeconds * 1000 &&
      rule.dedupeKey === dedupeKey
    )
      return { triggered: false, reason: 'cooldown' };
    const notification = await this.notifications.save(
      this.notifications.create({
        userId: job.userId,
        type: rule.type,
        title: alertTitle(rule.type),
        body: alertBody(rule.type, job.observation),
        readAt: null,
        metadata: { dedupeKey, observation: job.observation ?? null, ruleId: rule.id },
      }),
    );
    rule.lastTriggeredAt = new Date();
    rule.dedupeKey = dedupeKey;
    await this.rules.save(rule);
    return { triggered: true, notificationId: notification.id };
  }

  private async rule(userId: string, id: string) {
    const rule = await this.rules.findOne({ where: { id, userId } });
    if (!rule) throw new NotFoundException('Alert rule not found');
    return rule;
  }
}

function matches(
  type: string,
  conditions: Record<string, unknown>,
  observation?: AlertObservation,
) {
  if (!observation) return false;
  if (type.endsWith('_completed')) return observation.state === 'completed';
  if (type.endsWith('_failed'))
    return ['failed', 'recovery_required'].includes(observation.state ?? '');
  if (type === 'anchor_transaction_change') return Boolean(observation.eventKey);
  const value = Number(observation.value);
  const threshold = Number(conditions.threshold);
  if (!Number.isFinite(value) || !Number.isFinite(threshold)) return false;
  const direction = conditions.direction === 'below' ? 'below' : 'above';
  return direction === 'below' ? value <= threshold : value >= threshold;
}
function alertTitle(type: string) {
  return type.replaceAll('_', ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
function alertBody(type: string, observation?: AlertObservation) {
  return `${alertTitle(type)} condition met${observation?.value ? ` at ${observation.value}` : ''}. Review the affected position before acting.`;
}
