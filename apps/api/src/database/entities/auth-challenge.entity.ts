import { Column, Entity, Index } from 'typeorm';
import { ApplicationEntity } from './base.entity';

@Entity('auth_challenges')
@Index(['accountAddress', 'network', 'expiresAt'])
@Index(['nonceHash'], { unique: true })
export class AuthChallenge extends ApplicationEntity {
  @Column({ length: 128 }) accountAddress!: string;
  @Column({ length: 32 }) network!: string;
  @Column({ length: 255 }) domain!: string;
  @Column({ length: 128 }) nonceHash!: string;
  @Column({ length: 255 }) nonce!: string;
  @Column({ type: 'timestamptz' }) expiresAt!: Date;
  @Column({ type: 'timestamptz', nullable: true }) consumedAt!: Date | null;
}
