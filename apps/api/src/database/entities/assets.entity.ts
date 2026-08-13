import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from 'typeorm';
import { ApplicationEntity, JSONB_COLUMN, NUMERIC_COLUMN } from './base.entity';

@Entity('asset_issuers')
@Unique(['network', 'issuerAddress'])
@Index(['issuerAddress'])
export class AssetIssuer extends ApplicationEntity {
  @Column({ length: 32 }) network!: string;
  @Column({ length: 128 }) issuerAddress!: string;
  @Column({ length: 255, nullable: true }) name!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('assets')
@Unique(['network', 'assetType', 'contractAddress', 'assetCode', 'issuerAddress'])
@Index(['contractAddress'])
@Index(['assetCode', 'issuerAddress'])
export class Asset extends ApplicationEntity {
  @Column({ length: 32 }) network!: string;
  @Column({ length: 32 }) assetType!: 'native' | 'classic' | 'contract';
  @Column({ length: 128, nullable: true }) contractAddress!: string | null;
  @Column({ length: 12, nullable: true }) assetCode!: string | null;
  @Column({ length: 128, nullable: true }) issuerAddress!: string | null;
  @Column('uuid', { nullable: true }) issuerId!: string | null;
  @ManyToOne(() => AssetIssuer, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'issuerId' })
  issuer!: AssetIssuer | null;
  @Column({ length: 18, default: '18' }) decimals!: string;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('asset_metadata')
@Unique(['assetId', 'key'])
export class AssetMetadata extends ApplicationEntity {
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column({ length: 128 }) key!: string;
  @Column({ type: 'text', nullable: true }) value!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('rwa_metadata')
@Unique(['assetId'])
export class RwaMetadata extends ApplicationEntity {
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column({ length: 255, nullable: true }) issuerName!: string | null;
  @Column({ length: 64, nullable: true }) jurisdiction!: string | null;
  @Column({ length: 255, nullable: true }) instrumentType!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}

@Entity('asset_prices')
@Index(['assetId', 'pricedAt'])
export class AssetPrice extends ApplicationEntity {
  @Column('uuid') assetId!: string;
  @ManyToOne(() => Asset, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'assetId' }) asset!: Asset;
  @Column(NUMERIC_COLUMN) price!: string;
  @Column({ length: 16, default: 'USD' }) quoteCurrency!: string;
  @Column({ type: 'timestamptz' }) pricedAt!: Date;
  @Column({ length: 64, nullable: true }) source!: string | null;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}
