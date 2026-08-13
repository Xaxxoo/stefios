import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import {
  addition,
  division,
  healthRatio,
  loanToValue,
  minimumReceived,
  multiplication,
  percentageChange,
  portfolioWeight,
  priceConversion,
  slippage,
  subtraction,
  weightedApy,
} from '../src/index';

describe('decimal-safe financial math', () => {
  it('preserves precision for basic arithmetic', () => {
    assert.equal(addition('0.1', '0.2'), '0.3');
    assert.equal(subtraction('1', '0.9'), '0.1');
    assert.equal(multiplication('12345678901234567890', '3'), '37037036703703703670');
    assert.equal(division('1', '3'), '0.33333333333333333333');
  });

  it('calculates changes and weighted rates', () => {
    assert.equal(percentageChange('100', '125'), '25');
    assert.equal(
      weightedApy([
        { rate: '10', weight: '1' },
        { rate: '20', weight: '3' },
      ]),
      '17.5',
    );
    assert.equal(weightedApy([]), '0');
  });

  it('calculates portfolio and trade values', () => {
    assert.equal(portfolioWeight('250', '1000'), '25');
    assert.equal(priceConversion('2.5', '4'), '10');
    assert.equal(slippage('100', '97.5'), '2.5');
    assert.equal(minimumReceived('1000', '1.5'), '985');
  });

  it('calculates lending safety metrics', () => {
    assert.equal(loanToValue('400', '1000'), '40');
    assert.equal(healthRatio('1000', '80', '400'), '2');
    assert.equal(healthRatio('1000', '80', '0'), '0');
  });

  it('does not rely on JavaScript Number precision', () => {
    assert.equal(addition('9007199254740992', '1'), '9007199254740993');
  });
});
