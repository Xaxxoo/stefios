import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ApplicationEntity, JSONB_COLUMN, NUMERIC_COLUMN } from './base.entity';
import { Asset } from './assets.entity';
import { StellarAccount, User } from './identity.entity';

@Entity('transactions')
@Index(['accountId', 'ledgerTimestamp'])
@Index(['transactionHash'], { unique: true })
export class Transaction extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @ManyToOne(() => StellarAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: StellarAccount;
  @Column({ length: 32 }) network!: string;
  @Column({ length: 128 }) transactionHash!: string;
  @Column({ type: 'bigint', nullable: true }) ledger!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) ledgerTimestamp!: Date | null;
  @Column({ length: 32 }) status!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('operations')
@Index(['transactionId'])
export class Operation extends ApplicationEntity {
  @Column('uuid') transactionId!: string;
  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction;
  @Column({ type: 'integer' }) operationIndex!: number;
  @Column({ length: 64 }) operationType!: string;
  @Column({ length: 128, nullable: true }) sourceAccountAddress!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('payments')
@Index(['fromAddress', 'toAddress'])
export class Payment extends ApplicationEntity {
  @Column('uuid') transactionId!: string;
  @ManyToOne(() => Transaction, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'transactionId' })
  transaction!: Transaction;
  @Column({ length: 128 }) fromAddress!: string;
  @Column({ length: 128 }) toAddress!: string;
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'RESTRICT' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column(NUMERIC_COLUMN) amount!: string;
  @Column({ length: 255, nullable: true }) memo!: string | null;
}

@Entity('anchors')
@Unique(['network', 'slug'])
export class Anchor extends ApplicationEntity {
  @Column({ length: 32 }) network!: string;
  @Column({ length: 128 }) slug!: string;
  @Column({ length: 255 }) name!: string;
  @Column({ length: 255, nullable: true }) domain!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('anchor_assets')
@Unique(['anchorId', 'assetId'])
export class AnchorAsset extends ApplicationEntity {
  @Column('uuid') anchorId!: string;
  @ManyToOne(() => Anchor, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'anchorId' })
  anchor!: Anchor;
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column({ length: 32 }) direction!: string;
}

@Entity('anchor_transactions')
@Index(['anchorId', 'status'])
export class AnchorTransaction extends ApplicationEntity {
  @Column('uuid') anchorId!: string;
  @ManyToOne(() => Anchor, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'anchorId' })
  anchor!: Anchor;
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ length: 64 }) externalId!: string;
  @Column({ length: 32 }) type!: string;
  @Column({ length: 32 }) status!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('cross_chain_transfers')
@Index(['userId', 'createdAt'])
export class CrossChainTransfer extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ length: 64, default: 'unknown' }) provider!: string;
  @Column({ length: 32 }) sourceNetwork!: string;
  @Column({ length: 32 }) destinationNetwork!: string;
  @Column({ length: 128, nullable: true }) sourceAsset!: string | null;
  @Column({ length: 128, nullable: true }) destinationAsset!: string | null;
  @Column({ length: 128, nullable: true }) sourceTransactionHash!: string | null;
  @Column({ length: 128, nullable: true }) destinationTransactionHash!: string | null;
  @Column('uuid', { nullable: true }) assetId!: string | null;
  @Column(NUMERIC_COLUMN) amount!: string;
  @Column({ type: 'jsonb', nullable: true }) fees!: Record<string, unknown> | null;
  @Column({ length: 32 }) status!: string;
  @Column({ length: 32, default: 'created' }) state!: string;
  @Column({ length: 64, nullable: true }) recoveryState!: string | null;
  @Column({ type: 'text', nullable: true }) error!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) completedAt!: Date | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('watchlist_items')
@Unique(['userId', 'targetType', 'targetRef'])
export class WatchlistItem extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ length: 32, default: 'asset' }) targetType!: string;
  @Column({ length: 255 }) targetRef!: string;
  @Column('uuid', { nullable: true }) assetId!: string | null;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE', nullable: true })
  @JoinColumn({ name: 'assetId' })
  asset!: Asset | null;
}

@Entity('alert_rules')
@Index(['userId', 'enabled'])
export class AlertRule extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ length: 64 }) type!: string;
  @Column(JSONB_COLUMN) conditions!: Record<string, unknown> | null;
  @Column({ default: true }) enabled!: boolean;
  @Column({ type: 'integer', default: 3600 }) cooldownSeconds!: number;
  @Column({ length: 255, nullable: true }) dedupeKey!: string | null;
  @Column({ type: 'timestamptz', nullable: true }) lastTriggeredAt!: Date | null;
}

@Entity('notifications')
@Index(['userId', 'createdAt'])
export class Notification extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ length: 64 }) type!: string;
  @Column({ length: 255 }) title!: string;
  @Column({ type: 'text' }) body!: string;
  @Column({ type: 'timestamptz', nullable: true }) readAt!: Date | null;
  @Column(JSONB_COLUMN) metadata!: Record<string, unknown> | null;
}

@Entity('sync_cursors')
@Unique(['provider', 'network', 'stream', 'cursorKey'])
export class SyncCursor extends ApplicationEntity {
  @Column({ length: 64 }) provider!: string;
  @Column({ length: 32 }) network!: string;
  @Column({ length: 128 }) stream!: string;
  @Column({ length: 255 }) cursorKey!: string;
  @Column({ length: 255 }) cursor!: string;
}

@Entity('indexer_jobs')
@Index(['status', 'runAt'])
export class IndexerJob extends ApplicationEntity {
  @Column({ length: 64 }) provider!: string;
  @Column({ length: 128 }) jobType!: string;
  @Column({ length: 32 }) status!: string;
  @Column({ type: 'timestamptz', nullable: true }) runAt!: Date | null;
  @Column({ type: 'integer', default: 0 }) attempts!: number;
  @Column(JSONB_COLUMN) payload!: Record<string, unknown> | null;
  @Column({ type: 'text', nullable: true }) lastError!: string | null;
}
