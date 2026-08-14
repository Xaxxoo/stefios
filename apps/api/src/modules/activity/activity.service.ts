import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import { Operation, Payment, StellarAccount, Transaction } from '../../database/entities';

export type ActivityItem = {
  hash: string;
  type: 'payment' | 'swap' | 'defi' | 'rwa' | 'anchor' | 'cross-chain' | 'transaction';
  status: 'pending' | 'confirmed' | 'failed' | 'unknown';
  timestamp: Date | null;
  source: string | null;
  summary: string;
  fee: string | null;
  network: string;
  protocol: string | null;
  operations: readonly { type: string; source: string | null; index: number }[];
  payments: readonly {
    from: string;
    to: string;
    amount: string;
    asset: string;
    memo: string | null;
  }[];
  explorerUrl: string;
};

@Injectable()
export class ActivityService {
  constructor(
    @InjectRepository(StellarAccount) private readonly accounts: Repository<StellarAccount>,
    @InjectRepository(Transaction) private readonly transactions: Repository<Transaction>,
    @InjectRepository(Operation) private readonly operations: Repository<Operation>,
    @InjectRepository(Payment) private readonly payments: Repository<Payment>,
  ) {}

  async list(
    address: string,
    network: 'mainnet' | 'testnet' = 'testnet',
    limit = 50,
  ): Promise<readonly ActivityItem[]> {
    const account = await this.accounts.findOne({ where: { accountAddress: address, network } });
    if (!account) throw new NotFoundException('Wallet account has not been synchronized');
    const transactions = await this.transactions.find({
      where: { accountId: account.id },
      order: { ledgerTimestamp: 'DESC', createdAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 100),
    });
    return this.normalize(transactions);
  }

  async detail(hash: string): Promise<ActivityItem> {
    const transaction = await this.transactions.findOne({ where: { transactionHash: hash } });
    if (!transaction) throw new NotFoundException('Transaction not found');
    const [result] = await this.normalize([transaction]);
    if (!result) throw new NotFoundException('Transaction could not be normalized');
    return result;
  }

  private async normalize(transactions: readonly Transaction[]): Promise<ActivityItem[]> {
    if (!transactions.length) return [];
    const ids = transactions.map((transaction) => transaction.id);
    const [operations, payments] = await Promise.all([
      this.operations.find({ where: { transactionId: In(ids) }, order: { operationIndex: 'ASC' } }),
      this.payments.find({ where: { transactionId: In(ids) }, relations: ['asset'] }),
    ]);
    return transactions.map((transaction) => {
      const txOperations = operations.filter(
        (operation) => operation.transactionId === transaction.id,
      );
      const txPayments = payments.filter((payment) => payment.transactionId === transaction.id);
      const metadata = transaction.providerMetadata ?? {};
      const protocol = typeof metadata.protocol === 'string' ? metadata.protocol : null;
      const type = this.type(txOperations, metadata);
      return {
        hash: transaction.transactionHash,
        type,
        status: this.status(transaction.status),
        timestamp: transaction.ledgerTimestamp,
        source: txOperations[0]?.sourceAccountAddress ?? null,
        summary: this.summary(type, txPayments, protocol),
        fee: typeof metadata.fee === 'string' ? metadata.fee : null,
        network: transaction.network,
        protocol,
        operations: txOperations.map((operation) => ({
          type: operation.operationType,
          source: operation.sourceAccountAddress,
          index: operation.operationIndex,
        })),
        payments: txPayments.map((payment) => ({
          from: payment.fromAddress,
          to: payment.toAddress,
          amount: payment.amount,
          asset:
            payment.asset?.assetCode ??
            (payment.asset?.assetType === 'native'
              ? 'XLM'
              : (payment.asset?.contractAddress ?? 'Asset')),
          memo: payment.memo,
        })),
        explorerUrl: `https://stellar.expert/explorer/${transaction.network === 'mainnet' ? 'public' : 'testnet'}/tx/${transaction.transactionHash}`,
      };
    });
  }

  private status(value: string): ActivityItem['status'] {
    const normalized = value.toLowerCase();
    if (['success', 'successful', 'confirmed'].includes(normalized)) return 'confirmed';
    if (['failed', 'error'].includes(normalized)) return 'failed';
    if (['pending', 'submitted'].includes(normalized)) return 'pending';
    return 'unknown';
  }
  private type(
    operations: readonly Operation[],
    metadata: Record<string, unknown>,
  ): ActivityItem['type'] {
    if (
      typeof metadata.category === 'string' &&
      ['rwa', 'anchor', 'cross-chain', 'defi', 'swap'].includes(metadata.category)
    )
      return metadata.category as ActivityItem['type'];
    const names = operations.map((operation) => operation.operationType.toLowerCase());
    if (names.some((name) => name.includes('payment'))) return 'payment';
    if (names.some((name) => name.includes('swap'))) return 'swap';
    return 'transaction';
  }
  private summary(
    type: ActivityItem['type'],
    payments: readonly Payment[],
    protocol: string | null,
  ) {
    if (payments.length)
      return `${payments.length === 1 ? 'Payment' : `${payments.length} payments`} ${protocol ? `via ${protocol}` : ''}`.trim();
    if (type === 'swap') return `Swap${protocol ? ` via ${protocol}` : ''}`;
    return `${type[0]?.toUpperCase() ?? ''}${type.slice(1)} transaction${protocol ? ` via ${protocol}` : ''}`;
  }
}
