import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import type { Repository } from 'typeorm';
import {
  AccountBalance,
  Asset,
  Operation,
  Payment,
  StellarAccount,
  SyncCursor,
  Transaction,
} from '../../database/entities';
import type {
  StellarAccountProvider,
  StellarTransactionProvider,
  StellarTokenProvider,
  StellarLedgerProvider,
} from '@sfo/stellar';
import { REDIS } from '../../infrastructure/redis.module';
import { STELLAR_RPC_PROVIDER } from '../stellar/stellar.module';
// eslint-disable-next-line @typescript-eslint/consistent-type-imports
import { RedisLockService } from './redis-lock';
import { SYNC_JOB_NAMES, SYNC_QUEUE, type SyncJobPayload, type SyncJobName } from './sync.types';
import type { Queue } from 'bullmq';
import { InjectQueue } from '@nestjs/bullmq';

type RawRecord = Record<string, unknown>;
type SyncStatus = {
  stream: string;
  cursor: string | null;
  status: 'idle' | 'running' | 'complete' | 'failed';
  updatedAt: Date | null;
  error: string | null;
};

@Injectable()
export class WalletSyncService {
  constructor(
    @InjectRepository(StellarAccount) private readonly accounts: Repository<StellarAccount>,
    @InjectRepository(AccountBalance) private readonly balances: Repository<AccountBalance>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(Transaction) private readonly transactions: Repository<Transaction>,
    @InjectRepository(Operation) private readonly operations: Repository<Operation>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
    @InjectRepository(SyncCursor) private readonly cursors: Repository<SyncCursor>,
    @InjectQueue(SYNC_QUEUE) private readonly queue: Queue,
    @Inject(STELLAR_RPC_PROVIDER)
    private readonly provider: StellarAccountProvider &
      StellarTransactionProvider &
      StellarTokenProvider &
      StellarLedgerProvider,
    private readonly locks: RedisLockService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async enqueue(payload: SyncJobPayload): Promise<{ jobId: string; status: string }> {
    const account = await this.ensureAccount(payload.network, payload.address);
    const jobId = `sync-account:${payload.network}:${payload.address}`;
    const existing = await this.queue.getJob(jobId);
    if (!existing || ['completed', 'failed'].includes(await existing.getState()))
      await this.queue.add(SYNC_JOB_NAMES.account, payload, {
        jobId,
        removeOnComplete: 100,
        removeOnFail: 100,
      });
    await this.redis.set(
      this.statusKey(payload),
      JSON.stringify({
        status: 'queued',
        address: account.accountAddress,
        network: account.network,
        updatedAt: new Date().toISOString(),
      }),
      'EX',
      86_400,
    );
    return { jobId, status: 'queued' };
  }

  async status(
    address: string,
    network: 'testnet' | 'mainnet',
  ): Promise<{ address: string; network: string; streams: readonly SyncStatus[] }> {
    const account = await this.accounts.findOne({ where: { accountAddress: address, network } });
    if (!account) throw new NotFoundException('Wallet account has not been synchronized');
    const streams = await Promise.all(
      Object.values(SYNC_JOB_NAMES)
        .filter((stream) => stream !== SYNC_JOB_NAMES.account)
        .map(async (stream) => this.cursorStatus(network, address, stream)),
    );
    const cached = await this.redis.get(this.statusKey({ address, network }));
    const overall = cached ? (JSON.parse(cached) as RawRecord) : { status: 'idle' };
    return {
      address,
      network,
      streams: streams.map((stream) => ({
        ...stream,
        status: (overall.status === 'running' ? 'running' : stream.status) as SyncStatus['status'],
      })),
    };
  }

  async listWallets(
    network?: 'testnet' | 'mainnet',
    address?: string,
  ): Promise<
    readonly { address: string; network: string; active: boolean; lastUpdatedAt: Date }[]
  > {
    const query = this.accounts
      .createQueryBuilder('account')
      .orderBy('account.updatedAt', 'DESC')
      .take(100);
    if (network) query.andWhere('account.network = :network', { network });
    if (address) query.andWhere('account.accountAddress = :address', { address });
    return (await query.getMany()).map((account) => ({
      address: account.accountAddress,
      network: account.network,
      active: account.isActive,
      lastUpdatedAt: account.updatedAt,
    }));
  }

  async run(name: SyncJobName, payload: SyncJobPayload): Promise<void> {
    await this.locks.withLock(`${payload.network}:${payload.address}:${name}`, async () => {
      await this.markOverall(payload, 'running');
      try {
        if (name === SYNC_JOB_NAMES.account) await this.syncAccount(payload);
        if (name === SYNC_JOB_NAMES.balances) await this.syncBalances(payload);
        if (name === SYNC_JOB_NAMES.transactions) await this.syncTransactions(payload);
        if (name === SYNC_JOB_NAMES.tokenBalances) await this.syncTokenBalances(payload);
        if (name === SYNC_JOB_NAMES.protocolPositions) await this.syncProtocolPositions(payload);
        await this.markCursor(payload, name, 'complete', undefined);
        await this.markOverall(payload, 'complete');
        await this.redis.del(`sfo:portfolio:${payload.network}:${payload.address}`);
      } catch (error) {
        await this.markCursor(
          payload,
          name,
          'failed',
          error instanceof Error ? error.message : 'sync failed',
        );
        await this.markOverall(payload, 'failed');
        throw error;
      }
    });
  }

  private async syncAccount(payload: SyncJobPayload): Promise<void> {
    await this.syncBalances(payload);
    await this.syncTransactions(payload);
    await this.syncTokenBalances(payload);
    await this.syncProtocolPositions(payload);
  }

  private async syncBalances(payload: SyncJobPayload): Promise<void> {
    const account = await this.ensureAccount(payload.network, payload.address);
    const result = await this.provider.getAccount(payload.address);
    const raw = result.raw as RawRecord;
    const balances = Array.isArray(raw.balances) ? (raw.balances as RawRecord[]) : [];
    const native = { asset_type: 'native', balance: raw.balance ?? raw.nativeBalance };
    const rows = [native, ...balances];
    for (const balance of rows) {
      const identity = this.balanceIdentity(payload.network, balance);
      if (!identity || typeof balance.balance !== 'string') continue;
      const asset = await this.ensureAsset(identity);
      await this.balances.upsert(
        {
          accountId: account.id,
          assetId: asset.id,
          amount: balance.balance,
          ledger: typeof raw.sequence === 'string' ? raw.sequence : null,
        },
        ['accountId', 'assetId'],
      );
    }
    await this.markCursor(payload, SYNC_JOB_NAMES.balances, 'complete', undefined);
  }

  private async syncTransactions(payload: SyncJobPayload): Promise<void> {
    const account = await this.ensureAccount(payload.network, payload.address);
    const cursor = await this.getCursor(payload, SYNC_JOB_NAMES.transactions);
    const latest = await this.provider.getLatestLedger();
    const startLedger = cursor ? Number(cursor.cursor) || 0 : Math.max(0, latest.sequence - 1000);
    const result = (await this.provider.getTransactions(
      startLedger,
      cursor?.cursorKey || undefined,
      100,
    )) as RawRecord;
    const records = Array.isArray(result.transactions) ? (result.transactions as RawRecord[]) : [];
    for (const record of records) await this.persistTransaction(account, payload, record);
    const nextCursor =
      typeof result.cursor === 'string' ? result.cursor : records.at(-1)?.paging_token;
    await this.saveCursor(
      payload,
      SYNC_JOB_NAMES.transactions,
      typeof nextCursor === 'string' ? nextCursor : String(latest.sequence),
    );
  }

  private async syncTokenBalances(payload: SyncJobPayload): Promise<void> {
    await this.ensureAccount(payload.network, payload.address);
    await this.markCursor(payload, SYNC_JOB_NAMES.tokenBalances, 'complete', undefined);
  }
  private async syncProtocolPositions(payload: SyncJobPayload): Promise<void> {
    await this.ensureAccount(payload.network, payload.address);
    await this.markCursor(payload, SYNC_JOB_NAMES.protocolPositions, 'complete', undefined);
  }

  private async persistTransaction(
    account: StellarAccount,
    payload: SyncJobPayload,
    raw: RawRecord,
  ): Promise<void> {
    const hash =
      typeof raw.hash === 'string' ? raw.hash : typeof raw.id === 'string' ? raw.id : null;
    if (!hash) return;
    const transactionData = {
      accountId: account.id,
      network: payload.network,
      transactionHash: hash,
      ledger: raw.ledger ? String(raw.ledger) : null,
      ledgerTimestamp: typeof raw.created_at === 'string' ? new Date(raw.created_at) : null,
      status:
        typeof raw.successful === 'boolean'
          ? raw.successful
            ? 'successful'
            : 'failed'
          : 'unknown',
      providerMetadata: raw as never,
    };
    await this.transactions.upsert(transactionData, ['transactionHash']);
    const transaction = await this.transactions.findOneOrFail({ where: { transactionHash: hash } });
    const operations = Array.isArray(raw.operations) ? (raw.operations as RawRecord[]) : [];
    for (const [index, operation] of operations.entries()) {
      await this.operations.upsert(
        {
          transactionId: transaction.id,
          operationIndex: index,
          operationType: typeof operation.type === 'string' ? operation.type : 'unknown',
          sourceAccountAddress:
            typeof operation.source_account === 'string' ? operation.source_account : null,
          providerMetadata: operation as never,
        },
        ['transactionId', 'operationIndex'],
      );
      if (
        operation.type === 'payment' &&
        typeof operation.from === 'string' &&
        typeof operation.to === 'string' &&
        typeof operation.amount === 'string'
      ) {
        const identity = this.balanceIdentity(payload.network, operation);
        if (!identity) continue;
        const asset = await this.ensureAsset(identity);
        await this.payments.upsert(
          {
            transactionId: transaction.id,
            fromAddress: operation.from,
            toAddress: operation.to,
            assetId: asset.id,
            amount: operation.amount,
            memo: typeof operation.memo === 'string' ? operation.memo : null,
          },
          ['transactionId'],
        );
      }
    }
  }

  private async ensureAccount(
    network: 'testnet' | 'mainnet',
    address: string,
  ): Promise<StellarAccount> {
    const existing = await this.accounts.findOne({ where: { network, accountAddress: address } });
    return (
      existing ??
      this.accounts.save(
        this.accounts.create({
          network,
          accountAddress: address,
          isActive: true,
          providerMetadata: null,
        }),
      )
    );
  }
  private async ensureAsset(identity: {
    network: string;
    assetType: 'native' | 'classic' | 'contract';
    assetCode: string | null;
    issuerAddress: string | null;
    contractAddress: string | null;
  }): Promise<Asset> {
    const existing = await this.assets.findOne({ where: identity as never });
    return (
      existing ??
      this.assets.save(
        this.assets.create({
          ...identity,
          decimals: identity.assetType === 'native' ? '7' : '18',
          providerMetadata: null,
        }),
      )
    );
  }
  private balanceIdentity(network: string, raw: RawRecord) {
    const type = raw.asset_type;
    if (type === 'native')
      return {
        network,
        assetType: 'native' as const,
        assetCode: null,
        issuerAddress: null,
        contractAddress: null,
      };
    if (type === 'credit_alphanum4' || type === 'credit_alphanum12')
      return {
        network,
        assetType: 'classic' as const,
        assetCode: typeof raw.asset_code === 'string' ? raw.asset_code : null,
        issuerAddress: typeof raw.asset_issuer === 'string' ? raw.asset_issuer : null,
        contractAddress: null,
      };
    if (type === 'contract')
      return {
        network,
        assetType: 'contract' as const,
        assetCode: null,
        issuerAddress: null,
        contractAddress: typeof raw.contract_id === 'string' ? raw.contract_id : null,
      };
    return null;
  }
  private cursorStatusKey(payload: SyncJobPayload, stream: string) {
    return {
      provider: 'stellar-rpc',
      network: payload.network,
      stream,
      cursorKey: payload.address,
    };
  }
  private async getCursor(payload: SyncJobPayload, stream: string) {
    return this.cursors.findOne({ where: this.cursorStatusKey(payload, stream) });
  }
  private async saveCursor(payload: SyncJobPayload, stream: string, cursor: string) {
    const key = this.cursorStatusKey(payload, stream);
    await this.cursors.upsert({ ...key, cursor }, ['provider', 'network', 'stream', 'cursorKey']);
  }
  private async markCursor(
    payload: SyncJobPayload,
    stream: string,
    status: SyncStatus['status'],
    error?: string,
  ) {
    await this.redis.set(
      `sfo:sync:${payload.network}:${payload.address}:${stream}`,
      JSON.stringify({ status, error: error ?? null, updatedAt: new Date().toISOString() }),
      'EX',
      86_400,
    );
  }
  private async cursorStatus(
    network: string,
    address: string,
    stream: string,
  ): Promise<SyncStatus> {
    const cursor = await this.cursors.findOne({
      where: { provider: 'stellar-rpc', network, stream, cursorKey: address },
    });
    const cached = await this.redis.get(`sfo:sync:${network}:${address}:${stream}`);
    const status = cached ? (JSON.parse(cached) as RawRecord) : {};
    return {
      stream,
      cursor: cursor?.cursor ?? null,
      status: (status.status as SyncStatus['status']) ?? 'idle',
      updatedAt: cursor?.updatedAt ?? null,
      error: typeof status.error === 'string' ? status.error : null,
    };
  }
  private statusKey(payload: SyncJobPayload) {
    return `sfo:sync:${payload.network}:${payload.address}:overall`;
  }
  private async markOverall(payload: SyncJobPayload, status: string) {
    await this.redis.set(
      this.statusKey(payload),
      JSON.stringify({ status, updatedAt: new Date().toISOString() }),
      'EX',
      86_400,
    );
  }
}
