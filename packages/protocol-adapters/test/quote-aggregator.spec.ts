import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { aggregateSwapQuotes } from '../src/quote-aggregator';
import type { ProtocolQuote } from '../src/types';

const input = { network: 'testnet' as const, type: 'native' as const };
const output = {
  network: 'testnet' as const,
  type: 'contract' as const,
  contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};
const quote = (
  protocol: 'aquarius' | 'sushi',
  amountOut: string,
  quotedAt = new Date(),
): ProtocolQuote => ({
  protocol,
  network: 'testnet',
  tokenIn: input,
  tokenOut: output,
  amountIn: '10',
  amountOut,
  route: [`${protocol}-pool`],
  routeXdr: 'route',
  priceImpact: '0.01',
  slippageBps: '50',
  source: protocol,
  quotedAt,
  stale: false,
});

describe('swap quote aggregation', () => {
  it('normalizes minimum received and chooses risk-adjusted routes', async () => {
    const result = await aggregateSwapQuotes(
      [
        { id: 'aquarius', getQuote: async () => quote('aquarius', '10') },
        { id: 'sushi', getQuote: async () => quote('sushi', '9.9') },
      ] as never,
      { network: 'testnet', tokenIn: input, tokenOut: output, amountIn: '10', slippageBps: '50' },
      {
        maxAgeMs: 30_000,
        outputWeight: '0.5',
        feeWeight: '0.2',
        impactWeight: '0.15',
        riskWeight: '0.15',
        providerRisk: { aquarius: 'high', sushi: 'low' },
      },
    );
    assert.equal(result.quotes.length, 2);
    assert.equal(result.quotes[0]?.minimumReceived, '9.95');
    assert.equal(result.recommended?.provider, 'sushi');
  });

  it('does not recommend expired quotes', async () => {
    const result = await aggregateSwapQuotes(
      [
        {
          id: 'aquarius',
          getQuote: async () => quote('aquarius', '10', new Date(Date.now() - 60_000)),
        },
      ] as never,
      { network: 'testnet', tokenIn: input, tokenOut: output, amountIn: '10', slippageBps: '50' },
    );
    assert.equal(result.quotes[0]?.stale, true);
    assert.equal(result.recommended, null);
  });
});
