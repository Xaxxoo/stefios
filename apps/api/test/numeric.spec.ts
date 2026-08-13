import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';

describe('financial numeric serialization', () => {
  it('keeps precise decimal values as strings', () => {
    const price = { price: '12345678901234567890.123456789012345678' };
    const balance = { amount: '0.000000000000000001' };
    assert.equal(typeof price.price, 'string');
    assert.equal(price.price, '12345678901234567890.123456789012345678');
    assert.equal(balance.amount, '0.000000000000000001');
    assert.notEqual(Number(price.price), price.price);
  });
});
