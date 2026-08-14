import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import type { AlertsService } from './alerts.service';
import { ALERT_QUEUE, type AlertJob } from './alerts.types';

@Processor(ALERT_QUEUE)
export class AlertsProcessor extends WorkerHost {
  constructor(private readonly alerts: AlertsService) {
    super();
  }
  process(job: Job<AlertJob>) {
    return this.alerts.evaluate(job.data);
  }
}
