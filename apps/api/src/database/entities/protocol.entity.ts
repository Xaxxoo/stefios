import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ApplicationEntity, JSONB_COLUMN, NUMERIC_COLUMN } from './base.entity';
import { Asset } from './assets.entity';
import { StellarAccount } from './identity.entity';

@Entity('protocols')
@Unique(['network', 'slug'])
@Index(['slug'])
export class Protocol extends ApplicationEntity {
  @Column({ length: 32 }) network!: string;
  @Column({ length: 128 }) slug!: string;
  @Column({ length: 255 }) name!: string;
  @Column({ length: 64, nullable: true }) category!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('protocol_markets')
@Unique(['protocolId', 'marketKey'])
export class ProtocolMarket extends ApplicationEntity {
  @Column('uuid') protocolId!: string;
  @ManyToOne(() => Protocol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'protocolId' })
  protocol!: Protocol;
  @Column({ length: 255 }) marketKey!: string;
  @Column('uuid', { nullable: true }) baseAssetId!: string | null;
  @Column('uuid', { nullable: true }) quoteAssetId!: string | null;
  @Column(NUMERIC_COLUMN) totalValueLocked!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('protocol_positions')
@Index(['accountId', 'protocolId'])
export class ProtocolPosition extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @ManyToOne(() => StellarAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: StellarAccount;
  @Column('uuid') protocolId!: string;
  @ManyToOne(() => Protocol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'protocolId' })
  protocol!: Protocol;
  @Column('uuid', { nullable: true }) marketId!: string | null;
  @Column(NUMERIC_COLUMN) value!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

abstract class AccountProtocolPosition extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @Column('uuid') protocolId!: string;
  @Column('uuid', { nullable: true }) assetId!: string | null;
  @Column(NUMERIC_COLUMN) principal!: string;
  @Column(NUMERIC_COLUMN) value!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('lending_positions')
export class LendingPosition extends AccountProtocolPosition {}
@Entity('borrow_positions')
export class BorrowPosition extends AccountProtocolPosition {}
@Entity('liquidity_positions')
export class LiquidityPosition extends AccountProtocolPosition {}
@Entity('reward_positions')
export class RewardPosition extends AccountProtocolPosition {}

@Entity('yield_snapshots')
@Index(['protocolId', 'snapshotAt'])
export class YieldSnapshot extends ApplicationEntity {
  @Column('uuid') protocolId!: string;
  @ManyToOne(() => Protocol, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'protocolId' })
  protocol!: Protocol;
  @Column('uuid', { nullable: true }) marketId!: string | null;
  @Column(NUMERIC_COLUMN) apy!: string;
  @Column(NUMERIC_COLUMN) apr!: string;
  @Column({ type: 'timestamptz' }) snapshotAt!: Date;
}

@Entity('risk_snapshots')
@Index(['accountId', 'snapshotAt'])
export class RiskSnapshot extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @ManyToOne(() => StellarAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: StellarAccount;
  @Column(NUMERIC_COLUMN) riskScore!: string;
  @Column(JSONB_COLUMN) metrics!: Record<string, unknown> | null;
  @Column({ type: 'timestamptz' }) snapshotAt!: Date;
}
