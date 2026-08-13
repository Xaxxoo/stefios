import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { Test } from '@nestjs/testing';
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { HealthService } from '../src/health/health.service';

describe('API foundation', () => {
  it('boots the health service', () => {
    const service = new HealthService(
      { query: async () => [] } as never,
      { ping: async () => 'PONG' } as never,
    );
    assert.ok(service);
  });

  it('boots a NestJS HTTP application and serves health', async () => {
    const module = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
        {
          provide: HealthService,
          useValue: {
            readiness: async () => ({ status: 'ok', checks: { database: 'up', redis: 'up' } }),
          },
        },
      ],
    }).compile();
    const app: INestApplication = module.createNestApplication();
    await app.init();
    await request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect({ status: 'ok', service: 'stellar-financial-os-api' });
    await app.close();
  });

  it('reports readiness when database and redis are available', async () => {
    const service = new HealthService(
      { query: async () => [] } as never,
      { ping: async () => 'PONG' } as never,
    );
    assert.deepEqual(await service.readiness(), {
      status: 'ok',
      checks: { database: 'up', redis: 'up' },
    });
  });

  it('reports not_ready when a dependency is unavailable', async () => {
    const service = new HealthService(
      {
        query: async () => {
          throw new Error('offline');
        },
      } as never,
      { ping: async () => 'PONG' } as never,
    );
    assert.equal((await service.readiness()).status, 'not_ready');
  });

  it('connects to PostgreSQL when DATABASE_URL is provided', async () => {
    if (!process.env.DATABASE_URL) return;
    const { DataSource } = await import('typeorm');
    const dataSource = new DataSource({ type: 'postgres', url: process.env.DATABASE_URL });
    await dataSource.initialize();
    await dataSource.query('SELECT 1');
    await dataSource.destroy();
  });
});
