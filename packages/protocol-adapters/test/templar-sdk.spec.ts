import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TemplarSdkAdapter, UnavailableTemplarProvider } from '../src/templar-sdk';
import type { TemplarPosition, TemplarProvider } from '../src/templar-sdk';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';

describe('TemplarSdkAdapter', () => {
  it('reports the documented Stellar boundary as unavailable by default', async () => {
    const adapter = new TemplarSdkAdapter(new UnavailableTemplarProvider());
    const status = await adapter.status('mainnet');
    assert.equal(status.status, 'unavailable');
    await assert.rejects(adapter.discoverMarkets('mainnet'));
  });

  it('passes normalized risk and lifecycle fields through a provider boundary', async () => {
    const position: TemplarPosition = {
      id: 'position-1',
      protocol: 'templar',
      marketId: 'market-1',
      account,
      kind: 'borrow',
      assets: [],
      value: null,
      healthRatio: '1.42',
      source: 'mock',
      asOf: new Date(),
      collateral: [],
      collateralValue: null,
      borrowed: [],
      borrowedValue: null,
      ltv: '0.65',
      liquidationThreshold: '0.80',
      health: '1.42',
      borrowRate: '0.08',
      positionStatus: 'active',
      lifecycleState: 'active',
      operationId: null,
    };
    const provider: TemplarProvider = {
      status: async () => ({
        status: 'available',
        source: 'mock',
        reason: null,
        checkedAt: new Date(),
      }),
      discoverMarkets: async () => [],
      getPositions: async () => [position],
      getRisk: async () => [
        {
          name: 'LTV',
          value: '0.65',
          unit: '%',
          severity: 'medium',
          protocol: 'templar',
          marketId: 'market-1',
          source: 'mock',
          asOf: new Date(),
        },
      ],
    };
    const adapter = new TemplarSdkAdapter(provider);
    assert.deepEqual(await adapter.getUserPositions('mainnet', account), [position]);
    assert.equal((await adapter.getRiskMetrics('mainnet', account)).length, 1);
  });

  it('does not expose transaction construction without a provider implementation', async () => {
    const adapter = new TemplarSdkAdapter(new UnavailableTemplarProvider());
    await assert.rejects(
      adapter.buildBorrowTransaction({ account, network: 'mainnet', amount: '1' }),
    );
  });
});
