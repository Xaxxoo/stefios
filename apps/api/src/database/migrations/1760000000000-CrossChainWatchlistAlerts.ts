import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CrossChainWatchlistAlerts1760000000000 implements MigrationInterface {
  name = 'CrossChainWatchlistAlerts1760000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS provider varchar(64) NOT NULL DEFAULT 'unknown'`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS source_asset varchar(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS destination_asset varchar(128)`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS fees jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS state varchar(32) NOT NULL DEFAULT 'created'`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS recovery_state varchar(64)`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS error text`,
    );
    await queryRunner.query(
      `ALTER TABLE cross_chain_transfers ADD COLUMN IF NOT EXISTS completed_at timestamptz`,
    );
    await queryRunner.query(`ALTER TABLE watchlist_items ALTER COLUMN asset_id DROP NOT NULL`);
    await queryRunner.query(
      `ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS target_type varchar(32) NOT NULL DEFAULT 'asset'`,
    );
    await queryRunner.query(
      `ALTER TABLE watchlist_items ADD COLUMN IF NOT EXISTS target_ref varchar(255)`,
    );
    await queryRunner.query(
      `UPDATE watchlist_items SET target_ref = asset_id::text WHERE target_ref IS NULL`,
    );
    await queryRunner.query(`ALTER TABLE watchlist_items ALTER COLUMN target_ref SET NOT NULL`);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS uq_watchlist_user_target ON watchlist_items(user_id, target_type, target_ref)`,
    );
    await queryRunner.query(
      `ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS cooldown_seconds integer NOT NULL DEFAULT 3600`,
    );
    await queryRunner.query(
      `ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS dedupe_key varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE alert_rules ADD COLUMN IF NOT EXISTS last_triggered_at timestamptz`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_cross_chain_user_state ON cross_chain_transfers(user_id, state, updated_at)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_watchlist_user_type ON watchlist_items(user_id, target_type)`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS idx_alert_rules_enabled ON alert_rules(enabled, updated_at)`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS idx_alert_rules_enabled');
    await queryRunner.query('DROP INDEX IF EXISTS idx_watchlist_user_type');
    await queryRunner.query('DROP INDEX IF EXISTS idx_cross_chain_user_state');
    await queryRunner.query('ALTER TABLE alert_rules DROP COLUMN IF EXISTS last_triggered_at');
    await queryRunner.query('ALTER TABLE alert_rules DROP COLUMN IF EXISTS dedupe_key');
    await queryRunner.query('ALTER TABLE alert_rules DROP COLUMN IF EXISTS cooldown_seconds');
    await queryRunner.query('DROP INDEX IF EXISTS uq_watchlist_user_target');
    await queryRunner.query('ALTER TABLE watchlist_items DROP COLUMN IF EXISTS target_ref');
    await queryRunner.query('ALTER TABLE watchlist_items DROP COLUMN IF EXISTS target_type');
    await queryRunner.query('ALTER TABLE watchlist_items ALTER COLUMN asset_id SET NOT NULL');
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS completed_at');
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS error');
    await queryRunner.query(
      'ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS recovery_state',
    );
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS state');
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS fees');
    await queryRunner.query(
      'ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS destination_asset',
    );
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS source_asset');
    await queryRunner.query('ALTER TABLE cross_chain_transfers DROP COLUMN IF EXISTS provider');
  }
}
