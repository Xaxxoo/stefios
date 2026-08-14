import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateDeFi, normalizeYieldOpportunity } from '../src/analytics';
import type { ProtocolPosition, ProtocolYieldMetrics } from '../src/types';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const position = (
  kind: ProtocolPosition['kind'],
  amount: string,
  protocol: ProtocolPosition['protocol'],
): ProtocolPosition => ({
  id: `${protocol}-${kind}`,
  protocol,
  marketId: 'market-1',
  account,
  kind,
  assets: [],
  value: { currency: 'USD', amount },
  healthRatio: null,
  source: 'mock',
  asOf: new Date(),
});

describe('protocol analytics', () => {
  it('aggregates supplied, borrowed, liquidity, and rewards without floating point loss', () => {
    const result = aggregateDeFi([
      {
        protocol: 'blend',
        positions: [position('supply', '100.10', 'blend'), position('borrow', '0.10', 'blend')],
      },
      {
        protocol: 'aquarius',
        positions: [
          position('liquidity', '20.20', 'aquarius'),
          position('reward', '1.005', 'aquarius'),
        ],
      },
    ]);
    assert.equal(result.totalSupplied, '100.1');
    assert.equal(result.totalBorrowed, '0.1');
    assert.equal(result.totalLiquidity, '20.2');
    assert.equal(result.netDeFiValue, '120.2');
    assert.equal(result.claimableRewards.value, '1.005');
  });

  it('keeps yield components and marks stale provider estimates', () => {
    const metric: ProtocolYieldMetrics = {
      protocol: 'blend',
      market: 'USDC market',
      apy: '0.0525',
      tvl: null,
      risk: 'medium',
      asOf: new Date(Date.now() - 60 * 60 * 1000),
      source: 'mock',
    };
    const result = normalizeYieldOpportunity('blend', metric);
    assert.equal(result.baseYield, '0.0525');
    assert.equal(result.rewardYield, null);
    assert.equal(result.totalEstimatedYield, '0.0525');
    assert.equal(result.stale, true);
    assert.match(result.methodology, /estimate/);
  });
});
