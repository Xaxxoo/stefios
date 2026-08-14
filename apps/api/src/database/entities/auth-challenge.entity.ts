import { Column, Entity, Index } from 'typeorm';
import { ApplicationEntity } from './base.entity';

@Entity('auth_challenges')
@Index(['accountAddress', 'network', 'expiresAt'])
@Index(['nonceHash'], { unique: true })
export class AuthChallenge extends ApplicationEntity {
  @Column({ type: 'varchar', length: 128 }) accountAddress!: string;
  @Column({ type: 'varchar', length: 32 }) network!: string;
  @Column({ type: 'varchar', length: 255 }) domain!: string;
  @Column({ type: 'varchar', length: 128 }) nonceHash!: string;
  @Column({ type: 'varchar', length: 255 }) nonce!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) consumedAt!: Date | null;
}
