import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { WalletSyncService } from './wallet-sync.service';
import { SYNC_QUEUE, SYNC_JOB_NAMES, type SyncJobPayload } from './sync.types';

@Processor(SYNC_QUEUE)
export class WalletSyncProcessor extends WorkerHost {
  constructor(private readonly sync: WalletSyncService) {
    super();
  }

  async process(job: Job<SyncJobPayload>): Promise<void> {
    if (job.name === SYNC_JOB_NAMES.account) {
      await this.sync.run(SYNC_JOB_NAMES.account, job.data);
      return;
    }
    if (
      Object.values(SYNC_JOB_NAMES).includes(
        job.name as (typeof SYNC_JOB_NAMES)[keyof typeof SYNC_JOB_NAMES],
      )
    ) {
      await this.sync.run(
        job.name as (typeof SYNC_JOB_NAMES)[keyof typeof SYNC_JOB_NAMES],
        job.data,
      );
    }
  }
}
