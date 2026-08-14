import Decimal from 'decimal.js';
import type { ProtocolId, ProtocolQuote, UnifiedSwapQuote } from './types';
import type { QuoteRequest } from './quote-source';
import type { ProtocolAdapter } from './adapter';

export type QuoteAggregationConfig = Readonly<{
  maxAgeMs: number;
  outputWeight: string;
  feeWeight: string;
  impactWeight: string;
  riskWeight: string;
  providerRisk?: Readonly<Partial<Record<ProtocolId, 'low' | 'medium' | 'high'>>>;
}>;
export const DEFAULT_QUOTE_AGGREGATION_CONFIG: QuoteAggregationConfig = {
  maxAgeMs: 30_000,
  outputWeight: '0.5',
  feeWeight: '0.2',
  impactWeight: '0.15',
  riskWeight: '0.15',
};

const riskScore = (risk: UnifiedSwapQuote['risk']) =>
  risk === 'low'
    ? new Decimal(0)
    : risk === 'medium'
      ? new Decimal(50)
      : risk === 'high'
        ? new Decimal(100)
        : new Decimal(60);
function minReceived(amount: string, slippageBps: string) {
  return new Decimal(amount)
    .times(new Decimal(10_000).minus(new Decimal(slippageBps)))
    .div(10_000)
    .toFixed();
}
function quoteToUnified(
  quote: ProtocolQuote,
  request: QuoteRequest,
  config: QuoteAggregationConfig,
): UnifiedSwapQuote {
  const expiration = new Date(quote.quotedAt.getTime() + config.maxAgeMs);
  const stale = quote.stale || Date.now() >= expiration.getTime();
  const risk = config.providerRisk?.[quote.protocol] ?? 'unknown';
  const impact =
    quote.priceImpact == null
      ? new Decimal(50)
      : Decimal.min(100, Decimal.max(0, new Decimal(quote.priceImpact).times(100)));
  const output = new Decimal(quote.amountOut);
  const exchangeRate = output.div(request.amountIn).toFixed();
  const warnings = [...(stale ? ['Quote expired or stale. Refresh before composing.'] : [])];
  if (quote.networkFee == null && quote.protocolFees == null)
    warnings.push('Network and protocol fee breakdown was not returned by the provider.');
  if (quote.priceImpact == null) warnings.push('Price impact was not returned by the provider.');
  if (!quote.route.length) warnings.push('Route details were not returned by the provider.');
  const score = new Decimal(config.outputWeight)
    .times(output)
    .minus(new Decimal(config.feeWeight).times(quote.protocol === 'aquarius' ? 1 : 0))
    .minus(new Decimal(config.impactWeight).times(impact.div(100)))
    .minus(new Decimal(config.riskWeight).times(riskScore(risk).div(100)))
    .minus(stale ? 1 : 0);
  return {
    inputAsset: request.tokenIn,
    inputAmount: request.amountIn,
    outputAsset: request.tokenOut,
    expectedOutput: quote.amountOut,
    minimumReceived: minReceived(quote.amountOut, request.slippageBps),
    exchangeRate,
    priceImpact: quote.priceImpact,
    networkFee: quote.networkFee ?? null,
    protocolFees: quote.protocolFees ?? null,
    route: quote.route,
    provider: quote.protocol,
    expiration,
    stale,
    risk,
    score: score.toFixed(),
    warnings,
  };
}

export async function aggregateSwapQuotes(
  adapters: readonly ProtocolAdapter[],
  request: QuoteRequest,
  config: QuoteAggregationConfig = DEFAULT_QUOTE_AGGREGATION_CONFIG,
) {
  const candidates = adapters.filter((adapter) => typeof adapter.getQuote === 'function');
  const results = await Promise.allSettled(candidates.map((adapter) => adapter.getQuote!(request)));
  const rawQuotes = results.flatMap((result) =>
    result.status === 'fulfilled' ? [quoteToUnified(result.value, request, config)] : [],
  );
  const maxOutput = rawQuotes.reduce(
    (max, quote) => Decimal.max(max, new Decimal(quote.expectedOutput)),
    new Decimal(0),
  );
  const quotes = rawQuotes.map((quote) => ({
    ...quote,
    score: new Decimal(config.outputWeight)
      .times(maxOutput.isZero() ? 0 : new Decimal(quote.expectedOutput).div(maxOutput))
      .minus(
        new Decimal(config.feeWeight).times(
          quote.protocolFees == null ? 0 : new Decimal(quote.protocolFees),
        ),
      )
      .minus(
        new Decimal(config.impactWeight).times(
          quote.priceImpact == null ? 0.5 : new Decimal(quote.priceImpact).times(100).div(100),
        ),
      )
      .minus(new Decimal(config.riskWeight).times(riskScore(quote.risk).div(100)))
      .minus(quote.stale ? 1 : 0)
      .toFixed(),
  }));
  const active = quotes.filter((quote) => !quote.stale);
  const recommended =
    [...active].sort((a, b) => new Decimal(b.score).cmp(new Decimal(a.score)))[0] ?? null;
  return {
    quotes,
    recommended,
    providers: candidates.map((adapter, index) => ({
      provider: adapter.id,
      status: results[index]?.status === 'fulfilled' ? 'available' : ('unavailable' as const),
    })),
  };
}
