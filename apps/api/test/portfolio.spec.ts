import assert from 'node:assert/strict';
import test from 'node:test';
import { aggregatePortfolio } from '../src/modules/portfolio/aggregation';

const quote = (price: string, stale = false) => ({
  asset: 'testnet:native',
  quoteCurrency: 'USD',
  price,
  timestamp: '2026-08-14T00:00:00.000Z',
  source: 'fixture',
  confidence: 'high' as const,
  stale,
});

test('does not double count an asset moved into a protocol position', () => {
  const result = aggregatePortfolio([
    {
      assetId: 'testnet:classic:USDC:issuer',
      quantity: '100',
      price: quote('1'),
      isWalletBalance: true,
      custodyKey: 'testnet:classic:USDC:issuer',
    },
    {
      assetId: 'protocol:Blend:100',
      quantity: '100',
      prevaluedValue: '100',
      protocol: 'Blend',
      custodyKey: 'testnet:classic:USDC:issuer',
      valuationSource: 'blend',
    },
  ]);

  assert.equal(result.grossAssetValue, '100');
  assert.equal(result.defiExposure, '100');
  assert.equal(result.availableLiquidity, '0');
});

test('aggregates exact values, liabilities, categories and protocols', () => {
  const result = aggregatePortfolio(
    [
      { assetId: 'xlm', quantity: '0.1', price: quote('3.333333333333333333'), category: 'native' },
      {
        assetId: 'rwa',
        quantity: '2',
        prevaluedValue: '100.25',
        category: 'rwa',
        isYieldBearing: true,
        apy: '0.05',
        valuationSource: 'issuer',
      },
      {
        assetId: 'lp',
        quantity: '1',
        prevaluedValue: '20',
        category: 'lp',
        protocol: 'Aquarius',
        isYieldBearing: true,
        apy: '0.10',
        valuationSource: 'amm',
      },
    ],
    [{ id: 'debt-1', protocol: 'Blend', value: '10.125' }],
  );

  assert.equal(result.grossAssetValue, '120.58333333333333333');
  assert.equal(result.liabilities, '10.125');
  assert.equal(result.netPortfolioValue, '110.45833333333333333');
  assert.equal(result.rwaExposure, '100.25');
  assert.equal(result.defiExposure, '20');
  assert.equal(result.estimatedPortfolioYield, '0.058316008316008316008');
  assert.deepEqual(result.unpricedAssets, []);
  assert.equal(result.liabilityValuations[0]?.source, null);
});

test('keeps missing prices unpriced and reports stale valuation provenance', () => {
  const result = aggregatePortfolio([
    { assetId: 'missing', quantity: '4', price: null },
    { assetId: 'stale', quantity: '2', price: quote('5', true) },
  ]);

  assert.equal(result.grossAssetValue, '10');
  assert.deepEqual(result.unpricedAssets, ['missing']);
  assert.equal(result.freshness, 'stale');
  assert.deepEqual(result.valuations[1], {
    asset: 'stale',
    value: '10',
    source: 'fixture',
    timestamp: '2026-08-14T00:00:00.000Z',
    stale: true,
  });
});
