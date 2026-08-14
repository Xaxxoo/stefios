import type { MigrationInterface, QueryRunner } from 'typeorm';

export class InstitutionalWalletSecurity1761000000000 implements MigrationInterface {
  name = 'InstitutionalWalletSecurity1761000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE wallet_connections ADD COLUMN IF NOT EXISTS label varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE wallet_connections ADD COLUMN IF NOT EXISTS account_group varchar(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE wallet_connections ADD COLUMN IF NOT EXISTS is_view_only boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE wallet_connections ADD COLUMN IF NOT EXISTS last_sync_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS last_used_at timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS user_agent varchar(255)`,
    );
    await queryRunner.query(`ALTER TABLE sessions ADD COLUMN IF NOT EXISTS ip_address varchar(64)`);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_connections_user_group ON wallet_connections(user_id, account_group)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_wallet_connections_user_view_only ON wallet_connections(user_id, is_view_only)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_wallet_connections_user_view_only');
    await queryRunner.query('DROP INDEX IF EXISTS idx_wallet_connections_user_group');
    await queryRunner.query('ALTER TABLE sessions DROP COLUMN IF EXISTS ip_address');
    await queryRunner.query('ALTER TABLE sessions DROP COLUMN IF EXISTS user_agent');
    await queryRunner.query('ALTER TABLE sessions DROP COLUMN IF EXISTS last_used_at');
    await queryRunner.query('ALTER TABLE wallet_connections DROP COLUMN IF EXISTS last_sync_at');
    await queryRunner.query('ALTER TABLE wallet_connections DROP COLUMN IF EXISTS is_view_only');
    await queryRunner.query('ALTER TABLE wallet_connections DROP COLUMN IF EXISTS account_group');
    await queryRunner.query('ALTER TABLE wallet_connections DROP COLUMN IF EXISTS label');
  }
}
