import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Unique } from 'typeorm';
import { ApplicationEntity, JSONB_COLUMN } from './base.entity';

@Entity('users')
export class User extends ApplicationEntity {
  @Column({ type: 'varchar', length: 255, unique: true }) externalId!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) email!: string | null;
  @Column({ type: 'varchar', length: 32, default: 'active' }) status!: string;
  @Column(JSONB_COLUMN) metadata!: Record<string, unknown> | null;
  @OneToMany(() => Session, (session) => session.user) sessions!: Session[];
}

@Entity('sessions')
@Index(['userId', 'expiresAt'])
export class Session extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, (user) => user.sessions, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'userId' })
  user!: User;
  @Column({ type: 'varchar', length: 255, unique: true }) tokenHash!: string;
  @Column({ type: 'varchar', length: 32, default: 'testnet' }) network!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) revokedAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastUsedAt!: Date | null;
  @Column({ type: 'varchar', length: 255, nullable: true }) userAgent!: string | null;
  @Column({ type: 'varchar', length: 64, nullable: true }) ipAddress!: string | null;
}

@Entity('wallet_connections')
@Unique(['userId', 'network', 'walletAddress'])
@Index(['walletAddress'])
export class WalletConnection extends ApplicationEntity {
  @Column('uuid') userId!: string;
  @ManyToOne(() => User, { onDelete: 'CASCADE' }) @JoinColumn({ name: 'userId' }) user!: User;
  @Column({ type: 'varchar', length: 32 }) network!: string;
  @Column({ type: 'varchar', length: 128 }) walletAddress!: string;
  @Column({ type: 'varchar', length: 64 }) provider!: string;
  @Column({ type: 'varchar', length: 255, nullable: true }) label!: string | null;
  @Column({ type: 'varchar', length: 128, nullable: true }) accountGroup!: string | null;
  @Column({ type: 'boolean', default: false }) isViewOnly!: boolean;
  @Column({ type: 'timestamptz', nullable: true }) lastSeenAt!: Date | null;
  @Column({ type: 'timestamptz', nullable: true }) lastSyncAt!: Date | null;
}

@Entity('stellar_accounts')
@Unique(['network', 'accountAddress'])
@Index(['accountAddress'])
export class StellarAccount extends ApplicationEntity {
  @Column({ type: 'varchar', length: 32 }) network!: string;
  @Column({ type: 'varchar', length: 128 }) accountAddress!: string;
  @Column({ type: 'boolean', default: true }) isActive!: boolean;
  @Column(JSONB_COLUMN) providerMetadata!: Record<string, unknown> | null;
}
