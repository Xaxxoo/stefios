import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { PricesService } from '../src/modules/prices/prices.service';
import type { NormalizedPriceQuote, PriceProvider } from '../src/modules/prices/price-providers';

const assetId = 'mainnet:classic:USDC:GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const createRedis = () => ({
  values: new Map<string, string>(),
  async get(key: string) {
    return this.values.get(key) ?? null;
  },
  async set(key: string, value: string) {
    this.values.set(key, value);
    return 'OK';
  },
});
const quote = (overrides: Partial<NormalizedPriceQuote> = {}): NormalizedPriceQuote => ({
  asset: assetId,
  quoteCurrency: 'USD',
  price: '1.234567890123456789',
  timestamp: new Date().toISOString(),
  source: 'mock',
  confidence: '0.9',
  stale: false,
  ...overrides,
});
const provider = (
  id: string,
  priority: number,
  result: NormalizedPriceQuote | null | Error,
): PriceProvider => ({
  id,
  priority,
  async getQuote() {
    if (result instanceof Error) throw result;
    return result;
  },
});

describe('PricesService', () => {
  it('falls back after provider failure', async () => {
    const service = new PricesService(
      [
        provider('dex', 1, new Error('down')),
        provider('amm', 2, quote({ price: '1.20', source: 'amm' })),
      ],
      createRedis() as never,
    );
    assert.equal((await service.get(assetId))?.source, 'amm');
  });
  it('returns missing quotes as null', async () => {
    const service = new PricesService([provider('dex', 1, null)], createRedis() as never);
    assert.equal(await service.get(assetId), null);
  });
  it('marks old quotes stale', async () => {
    const service = new PricesService(
      [
        provider(
          'rwa-nav',
          1,
          quote({ timestamp: new Date(Date.now() - 3600001).toISOString(), source: 'rwa-nav' }),
        ),
      ],
      createRedis() as never,
    );
    assert.equal((await service.get(assetId))?.stale, true);
  });
  it('uses the highest priority available source', async () => {
    const service = new PricesService(
      [
        provider('amm', 5, quote({ source: 'amm', price: '2' })),
        provider('dex', 1, quote({ source: 'dex', price: '3' })),
      ],
      createRedis() as never,
    );
    assert.equal((await service.get(assetId))?.source, 'dex');
  });
  it('preserves decimal precision and does not coerce to Number', async () => {
    const service = new PricesService(
      [provider('external-market-data', 1, quote())],
      createRedis() as never,
    );
    assert.equal((await service.get(assetId))?.price, '1.234567890123456789');
  });
});
