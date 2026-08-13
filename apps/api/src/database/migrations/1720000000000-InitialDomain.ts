import type { MigrationInterface, QueryRunner } from 'typeorm';

const common = `id uuid PRIMARY KEY DEFAULT gen_random_uuid(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()`;
const numeric = 'numeric(38,18) NOT NULL';

export class InitialDomain1720000000000 implements MigrationInterface {
  name = 'InitialDomain1720000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE EXTENSION IF NOT EXISTS "pgcrypto"');
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS users (${common}, external_id varchar(255) NOT NULL UNIQUE, email varchar(255), status varchar(32) NOT NULL DEFAULT 'active', metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS sessions (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, token_hash varchar(255) NOT NULL UNIQUE, expires_at timestamptz NOT NULL, revoked_at timestamptz)`,
    );
    await queryRunner.query(
      `ALTER TABLE sessions ADD COLUMN IF NOT EXISTS network varchar(32) NOT NULL DEFAULT 'testnet'`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS auth_challenges (${common}, account_address varchar(128) NOT NULL, network varchar(32) NOT NULL, domain varchar(255) NOT NULL, nonce_hash varchar(128) NOT NULL UNIQUE, nonce varchar(255) NOT NULL, expires_at timestamptz NOT NULL, consumed_at timestamptz)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS wallet_connections (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, network varchar(32) NOT NULL, wallet_address varchar(128) NOT NULL, provider varchar(64) NOT NULL, last_seen_at timestamptz, UNIQUE(user_id, network, wallet_address))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS stellar_accounts (${common}, network varchar(32) NOT NULL, account_address varchar(128) NOT NULL, is_active boolean NOT NULL DEFAULT true, provider_metadata jsonb, UNIQUE(network, account_address))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS asset_issuers (${common}, network varchar(32) NOT NULL, issuer_address varchar(128) NOT NULL, name varchar(255), provider_metadata jsonb, UNIQUE(network, issuer_address))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS assets (${common}, network varchar(32) NOT NULL, asset_type varchar(32) NOT NULL, contract_address varchar(128), asset_code varchar(12), issuer_address varchar(128), issuer_id uuid REFERENCES asset_issuers(id) ON DELETE SET NULL, decimals varchar(18) NOT NULL DEFAULT '18', provider_metadata jsonb, UNIQUE(network, asset_type, contract_address, asset_code, issuer_address))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS asset_metadata (${common}, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, key varchar(128) NOT NULL, value text, provider_metadata jsonb, UNIQUE(asset_id, key))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS rwa_metadata (${common}, asset_id uuid NOT NULL UNIQUE REFERENCES assets(id) ON DELETE CASCADE, issuer_name varchar(255), jurisdiction varchar(64), instrument_type varchar(255), provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS asset_prices (${common}, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, price ${numeric}, quote_currency varchar(16) NOT NULL DEFAULT 'USD', priced_at timestamptz NOT NULL, source varchar(64), provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS account_balances (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, amount ${numeric}, ledger bigint, UNIQUE(account_id, asset_id))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS portfolio_snapshots (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, snapshot_at timestamptz NOT NULL, total_value ${numeric}, total_cost_basis ${numeric}, quote_currency varchar(16) NOT NULL DEFAULT 'USD', provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS portfolio_positions (${common}, snapshot_id uuid NOT NULL REFERENCES portfolio_snapshots(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, quantity ${numeric}, value ${numeric}, cost_basis ${numeric}, UNIQUE(snapshot_id, asset_id))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS protocols (${common}, network varchar(32) NOT NULL, slug varchar(128) NOT NULL, name varchar(255) NOT NULL, category varchar(64), provider_metadata jsonb, UNIQUE(network, slug))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS protocol_markets (${common}, protocol_id uuid NOT NULL REFERENCES protocols(id) ON DELETE CASCADE, market_key varchar(255) NOT NULL, base_asset_id uuid REFERENCES assets(id), quote_asset_id uuid REFERENCES assets(id), total_value_locked ${numeric}, provider_metadata jsonb, UNIQUE(protocol_id, market_key))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS protocol_positions (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, protocol_id uuid NOT NULL REFERENCES protocols(id) ON DELETE CASCADE, market_id uuid REFERENCES protocol_markets(id), value ${numeric}, provider_metadata jsonb)`,
    );
    for (const table of [
      'lending_positions',
      'borrow_positions',
      'liquidity_positions',
      'reward_positions',
    ])
      await queryRunner.query(
        `CREATE TABLE IF NOT EXISTS ${table} (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, protocol_id uuid NOT NULL REFERENCES protocols(id) ON DELETE CASCADE, asset_id uuid REFERENCES assets(id), principal ${numeric}, value ${numeric}, provider_metadata jsonb)`,
      );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS yield_snapshots (${common}, protocol_id uuid NOT NULL REFERENCES protocols(id) ON DELETE CASCADE, market_id uuid REFERENCES protocol_markets(id), apy ${numeric}, apr ${numeric}, snapshot_at timestamptz NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS risk_snapshots (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, risk_score ${numeric}, metrics jsonb, snapshot_at timestamptz NOT NULL)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS transactions (${common}, account_id uuid NOT NULL REFERENCES stellar_accounts(id) ON DELETE CASCADE, network varchar(32) NOT NULL, transaction_hash varchar(128) NOT NULL UNIQUE, ledger bigint, ledger_timestamp timestamptz, status varchar(32) NOT NULL, provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS operations (${common}, transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, operation_index integer NOT NULL, operation_type varchar(64) NOT NULL, source_account_address varchar(128), provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS payments (${common}, transaction_id uuid NOT NULL REFERENCES transactions(id) ON DELETE CASCADE, from_address varchar(128) NOT NULL, to_address varchar(128) NOT NULL, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE RESTRICT, amount ${numeric}, memo varchar(255))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS anchors (${common}, network varchar(32) NOT NULL, slug varchar(128) NOT NULL, name varchar(255) NOT NULL, domain varchar(255), provider_metadata jsonb, UNIQUE(network, slug))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS anchor_assets (${common}, anchor_id uuid NOT NULL REFERENCES anchors(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, direction varchar(32) NOT NULL, UNIQUE(anchor_id, asset_id))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS anchor_transactions (${common}, anchor_id uuid NOT NULL REFERENCES anchors(id) ON DELETE RESTRICT, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, external_id varchar(64) NOT NULL, type varchar(32) NOT NULL, status varchar(32) NOT NULL, provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS cross_chain_transfers (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, source_network varchar(32) NOT NULL, destination_network varchar(32) NOT NULL, source_transaction_hash varchar(128), destination_transaction_hash varchar(128), asset_id uuid REFERENCES assets(id), amount ${numeric}, status varchar(32) NOT NULL, provider_metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS watchlist_items (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, asset_id uuid NOT NULL REFERENCES assets(id) ON DELETE CASCADE, UNIQUE(user_id, asset_id))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS alert_rules (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar(64) NOT NULL, conditions jsonb, enabled boolean NOT NULL DEFAULT true)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS notifications (${common}, user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE, type varchar(64) NOT NULL, title varchar(255) NOT NULL, body text NOT NULL, read_at timestamptz, metadata jsonb)`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS sync_cursors (${common}, provider varchar(64) NOT NULL, network varchar(32) NOT NULL, stream varchar(128) NOT NULL, cursor_key varchar(255) NOT NULL, cursor varchar(255) NOT NULL, UNIQUE(provider, network, stream, cursor_key))`,
    );
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS indexer_jobs (${common}, provider varchar(64) NOT NULL, job_type varchar(128) NOT NULL, status varchar(32) NOT NULL, run_at timestamptz, attempts integer NOT NULL DEFAULT 0, payload jsonb, last_error text)`,
    );
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS idx_auth_challenges_account_expiry ON auth_challenges(account_address, network, expires_at)',
    );
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_wallet_connections_address ON wallet_connections(wallet_address)',
      'CREATE INDEX IF NOT EXISTS idx_stellar_accounts_address ON stellar_accounts(account_address)',
      'CREATE INDEX IF NOT EXISTS idx_assets_contract ON assets(contract_address)',
      'CREATE INDEX IF NOT EXISTS idx_assets_code_issuer ON assets(asset_code, issuer_address)',
      'CREATE INDEX IF NOT EXISTS idx_asset_prices_asset_time ON asset_prices(asset_id, priced_at)',
      'CREATE INDEX IF NOT EXISTS idx_transactions_account_ledger_time ON transactions(account_id, ledger_timestamp)',
      'CREATE INDEX IF NOT EXISTS idx_protocols_slug ON protocols(slug)',
      'CREATE INDEX IF NOT EXISTS idx_protocol_positions_account_protocol ON protocol_positions(account_id, protocol_id)',
      'CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications(user_id, created_at)',
      'CREATE INDEX IF NOT EXISTS idx_indexer_jobs_status_run ON indexer_jobs(status, run_at)',
    ];
    for (const index of indexes) await queryRunner.query(index);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const table of [
      'indexer_jobs',
      'sync_cursors',
      'notifications',
      'alert_rules',
      'watchlist_items',
      'cross_chain_transfers',
      'anchor_transactions',
      'anchor_assets',
      'anchors',
      'payments',
      'operations',
      'transactions',
      'risk_snapshots',
      'yield_snapshots',
      'reward_positions',
      'liquidity_positions',
      'borrow_positions',
      'lending_positions',
      'protocol_positions',
      'protocol_markets',
      'protocols',
      'portfolio_positions',
      'portfolio_snapshots',
      'account_balances',
      'asset_prices',
      'rwa_metadata',
      'asset_metadata',
      'assets',
      'asset_issuers',
      'stellar_accounts',
      'wallet_connections',
      'auth_challenges',
      'sessions',
      'users',
    ])
      await queryRunner.query(`DROP TABLE IF EXISTS ${table}`);
  }
}
