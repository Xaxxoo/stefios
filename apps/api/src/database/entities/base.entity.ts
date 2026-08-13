import { CreateDateColumn, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';

export abstract class ApplicationEntity {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;

  @UpdateDateColumn({ type: 'timestamptz' })
  updatedAt!: Date;
}

export const NUMERIC_COLUMN = { type: 'numeric', precision: 38, scale: 18 } as const;
export const JSONB_COLUMN = { type: 'jsonb', nullable: true } as const;
