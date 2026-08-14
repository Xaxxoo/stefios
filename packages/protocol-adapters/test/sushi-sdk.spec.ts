import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SushiSdkAdapter, UnavailableSushiProvider, type SushiProvider } from '../src/sushi-sdk';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const pool = {
  id: 'pool-1',
  protocol: 'sushi' as const,
  network: 'mainnet' as const,
  name: 'XLM / USDC',
  assets: [],
  category: 'liquidity' as const,
  enabled: true,
  source: 'test',
  asOf: new Date(),
  feeTier: '0.05%',
  concentrated: true,
};

test('unavailable provider stays explicitly unavailable', async () => {
  const adapter = new SushiSdkAdapter(new UnavailableSushiProvider());
  assert.equal((await adapter.status('mainnet')).status, 'unavailable');
  await assert.rejects(
    () => adapter.discoverMarkets('mainnet'),
    /No verified Sushi-on-Stellar provider/,
  );
});

test('normalizes provider pools and concentrated position metadata', async () => {
  const provider: SushiProvider = {
    status: async () => ({
      status: 'available',
      source: 'test',
      reason: null,
      checkedAt: new Date(),
    }),
    discoverPools: async () => [pool],
    getPositions: async () => [
      {
        id: 'position-1',
        ...pool,
        account,
        marketId: pool.id,
        kind: 'liquidity',
        assets: [],
        value: null,
        healthRatio: null,
        source: 'test',
        asOf: new Date(),
        priceRange: { lower: '1', upper: '2', unit: 'price' },
        inRange: true,
        fees: [],
        apr: '0.1',
      },
    ],
  };
  const adapter = new SushiSdkAdapter(provider);
  assert.equal((await adapter.discoverMarkets('mainnet'))[0]?.feeTier, '0.05%');
  assert.equal((await adapter.getUserPositions('mainnet', account))[0]?.inRange, true);
});

test('does not expose action support until a provider implements it', async () => {
  const adapter = new SushiSdkAdapter(new UnavailableSushiProvider());
  await assert.rejects(
    () => adapter.buildSwapTransaction({ account, network: 'mainnet', amount: '1' }),
    /actions are disabled/,
  );
});
