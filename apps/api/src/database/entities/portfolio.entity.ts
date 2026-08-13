import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ApplicationEntity, JSONB_COLUMN, NUMERIC_COLUMN } from './base.entity';
import { Asset } from './assets.entity';
import { StellarAccount } from './identity.entity';

@Entity('account_balances')
@Unique(['accountId', 'assetId'])
@Index(['accountId'])
export class AccountBalance extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @ManyToOne(() => StellarAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: StellarAccount;
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column(NUMERIC_COLUMN) amount!: string;
  @Column({ type: 'bigint', nullable: true }) ledger!: string | null;
}

@Entity('portfolio_snapshots')
@Index(['accountId', 'snapshotAt'])
export class PortfolioSnapshot extends ApplicationEntity {
  @Column('uuid') accountId!: string;
  @ManyToOne(() => StellarAccount, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'accountId' })
  account!: StellarAccount;
  @Column({ type: 'timestamptz' }) snapshotAt!: Date;
  @Column(NUMERIC_COLUMN) totalValue!: string;
  @Column(NUMERIC_COLUMN) totalCostBasis!: string;
  @Column({ length: 16, default: 'USD' }) quoteCurrency!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('portfolio_positions')
@Unique(['snapshotId', 'assetId'])
export class PortfolioPosition extends ApplicationEntity {
  @Column('uuid') snapshotId!: string;
  @ManyToOne(() => PortfolioSnapshot, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'snapshotId' })
  snapshot!: PortfolioSnapshot;
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column(NUMERIC_COLUMN) quantity!: string;
  @Column(NUMERIC_COLUMN) value!: string;
  @Column(NUMERIC_COLUMN) costBasis!: string;
}
