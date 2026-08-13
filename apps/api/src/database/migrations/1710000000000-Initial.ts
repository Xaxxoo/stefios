import type { MigrationInterface, QueryRunner } from 'typeorm';

export class Initial1710000000000 implements MigrationInterface {
  name = 'Initial1710000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "schema_version" ("id" SERIAL PRIMARY KEY, "created_at" TIMESTAMP NOT NULL DEFAULT now())`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS "schema_version"');
  }
}
