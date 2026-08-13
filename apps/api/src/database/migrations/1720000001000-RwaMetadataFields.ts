import type { MigrationInterface, QueryRunner } from 'typeorm';

export class RwaMetadataFields1720000001000 implements MigrationInterface {
  name = 'RwaMetadataFields1720000001000';

  async up(queryRunner: QueryRunner): Promise<void> {
    const columns = [
      'manager varchar(255)',
      'product_name varchar(255)',
      'denomination varchar(64)',
      'underlying_asset_category varchar(128)',
      'nav numeric(38,18)',
      'nav_timestamp timestamptz',
      'indicated_yield numeric(38,18)',
      'yield_timestamp timestamptz',
      'maturity timestamptz',
      'duration numeric(38,18)',
      'transfer_restrictions text',
      'eligibility_requirements text',
      'official_url text',
      'disclosures_url text',
      'source varchar(32)',
      'freshness timestamptz',
      "verification varchar(32) CHECK (verification IN ('verified', 'unverified', 'unknown'))",
    ];
    for (const column of columns) {
      const name = column.split(' ')[0];
      await queryRunner.query(`ALTER TABLE rwa_metadata ADD COLUMN IF NOT EXISTS ${column}`);
      await queryRunner.query(
        `CREATE INDEX IF NOT EXISTS idx_rwa_metadata_${name} ON rwa_metadata (${name})`,
      );
    }
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    for (const name of [
      'manager',
      'product_name',
      'denomination',
      'underlying_asset_category',
      'nav',
      'nav_timestamp',
      'indicated_yield',
      'yield_timestamp',
      'maturity',
      'duration',
      'transfer_restrictions',
      'eligibility_requirements',
      'official_url',
      'disclosures_url',
      'source',
      'freshness',
      'verification',
    ]) {
      await queryRunner.query(`DROP INDEX IF EXISTS idx_rwa_metadata_${name}`);
      await queryRunner.query(`ALTER TABLE rwa_metadata DROP COLUMN IF EXISTS ${name}`);
    }
  }
}
