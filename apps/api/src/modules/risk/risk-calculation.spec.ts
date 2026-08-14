import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { calculatePortfolioRisk } from './risk-calculation';

describe('portfolio risk calculation', () => {
  it('calculates concentration, liquidity, debt, and data-quality signals with decimal values', () => {
    const result = calculatePortfolioRisk({
      grossAssetValue: '100.10',
      liabilities: '20.10',
      availableLiquidity: '10.00',
      unpricedAssets: [],
      freshness: 'mixed',
      byAsset: [
        {
          asset: 'mainnet:classic:USDC:GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
          category: 'stablecoin',
          value: '60.10',
          protocol: null,
        },
        {
          asset: 'mainnet:contract:CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
          category: 'rwa',
          value: '40.00',
          protocol: 'blend',
        },
      ],
      byCategory: [
        { category: 'stablecoin', value: '60.10' },
        { category: 'rwa', value: '40.00' },
      ],
      byProtocol: [{ protocol: 'blend', value: '40.00' }],
      positionHealth: [{ name: 'health', value: '1.2', severity: 'high', protocol: 'blend' }],
    });
    assert.equal(result.overallScore !== null, true);
    assert.equal(
      result.signals.find((item) => item.category === 'stablecoinExposure')?.score,
      '60.04',
    );
    assert.equal(
      result.signals.find((item) => item.category === 'crossChainPendingExposure')?.severity,
      'unknown',
    );
    assert.equal(result.heatmap.length, 2);
    assert.equal(result.methodology.length, 13);
  });

  it('does not turn absent inputs into a low-risk conclusion', () => {
    const result = calculatePortfolioRisk({
      grossAssetValue: '0',
      liabilities: '0',
      availableLiquidity: '0',
      unpricedAssets: [],
      freshness: 'unknown',
      byAsset: [],
      byCategory: [],
      byProtocol: [],
      positionHealth: [],
    });
    assert.equal(result.overallScore, null);
    assert.equal(result.severity, 'unknown');
    assert.match(result.explanation, /cannot be scored/);
  });
});
