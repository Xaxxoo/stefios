import Decimal from 'decimal.js';
import type { NormalizedPriceQuote } from '../prices/price-providers';

export type PortfolioAssetInput = {
  assetId: string;
  symbol?: string | null;
  category?: string | null;
  protocol?: string | null;
  quantity: string;
  price?: NormalizedPriceQuote | null;
  prevaluedValue?: string | null;
  valuationSource?: string | null;
  valuationTimestamp?: string | null;
  valuationStale?: boolean;
  isWalletBalance?: boolean;
  isYieldBearing?: boolean;
  apy?: string | null;
  custodyKey?: string | null;
};

export type PortfolioLiabilityInput = {
  id: string;
  protocol: string;
  value: string;
  freshness?: string | null;
  source?: string | null;
};

export type PortfolioAggregation = {
  grossAssetValue: string;
  liabilities: string;
  netPortfolioValue: string;
  availableLiquidity: string;
  estimatedPortfolioYield: string | null;
  yieldBearingAssets: string;
  rwaExposure: string;
  defiExposure: string;
  unpricedAssets: readonly string[];
  byAsset: readonly {
    asset: string;
    symbol: string | null;
    value: string | null;
    price: string | null;
    source: string | null;
    timestamp: string | null;
    stale: boolean | null;
  }[];
  byCategory: readonly Record<string, string>[];
  byProtocol: readonly Record<string, string>[];
  valuations: readonly Record<string, unknown>[];
  liabilityValuations: readonly Record<string, unknown>[];
  freshness: 'fresh' | 'stale' | 'mixed' | 'unknown';
};

export function aggregatePortfolio(
  inputs: readonly PortfolioAssetInput[],
  liabilities: readonly PortfolioLiabilityInput[] = [],
): PortfolioAggregation {
  const custodied = new Set(
    inputs
      .filter((item) => item.custodyKey && !item.isWalletBalance)
      .map((item) => item.custodyKey as string),
  );
  const included = inputs.filter(
    (item) => !(item.isWalletBalance && item.custodyKey && custodied.has(item.custodyKey)),
  );
  const valuations = included.map((item) => {
    const quantity = new Decimal(item.quantity);
    const quote = item.price;
    const value =
      item.prevaluedValue != null
        ? new Decimal(item.prevaluedValue)
        : quote?.price != null
          ? quantity.times(quote.price)
          : null;
    return { item, value, quote };
  });
  const zero = new Decimal(0);
  const valueOf = (row: (typeof valuations)[number]) => row.value ?? zero;
  const gross = valuations.reduce((sum, row) => sum.plus(valueOf(row)), zero);
  const debt = liabilities.reduce((sum, item) => sum.plus(new Decimal(item.value)), zero);
  const liquidity = valuations
    .filter(({ item }) => item.isWalletBalance)
    .reduce((sum, row) => sum.plus(valueOf(row)), zero);
  const yieldRows = valuations.filter(({ item }) => item.isYieldBearing);
  const yieldAssets = yieldRows.reduce((sum, row) => sum.plus(valueOf(row)), zero);
  const rwa = valuations
    .filter(({ item }) => item.category === 'rwa' || item.category === 'fund')
    .reduce((sum, row) => sum.plus(valueOf(row)), zero);
  const defi = valuations
    .filter(({ item }) => Boolean(item.protocol))
    .reduce((sum, row) => sum.plus(valueOf(row)), zero);
  const knownYield = yieldRows.filter(({ item, value }) => value && item.apy != null);
  const estimatedPortfolioYield =
    knownYield.length === 0 || yieldAssets.isZero()
      ? null
      : knownYield
          .reduce(
            (sum, row) => sum.plus(valueOf(row).times(new Decimal(row.item.apy as string))),
            zero,
          )
          .div(yieldAssets)
          .toFixed();
  const staleCount = valuations.filter(
    ({ item, quote }) => quote?.stale || item.valuationStale,
  ).length;
  const valuedCount = valuations.filter(({ value }) => value !== null).length;
  const freshness =
    valuedCount === 0
      ? 'unknown'
      : staleCount === 0
        ? 'fresh'
        : staleCount === valuedCount
          ? 'stale'
          : 'mixed';
  const byAsset = valuations.map(({ item, value, quote }) => ({
    asset: item.assetId,
    symbol: item.symbol ?? null,
    value: value?.toFixed() ?? null,
    price: quote?.price ?? null,
    source: quote?.source ?? item.valuationSource ?? null,
    timestamp: quote?.timestamp ?? item.valuationTimestamp ?? null,
    stale: quote?.stale ?? item.valuationStale ?? null,
  }));
  const categories = new Set(valuations.map(({ item }) => item.category ?? 'other'));
  const byCategory = [...categories].map((category) => ({
    category,
    value: valuations
      .filter(({ item }) => (item.category ?? 'other') === category)
      .reduce((sum, row) => sum.plus(valueOf(row)), zero)
      .toFixed(),
  }));
  const protocols = new Set(
    valuations
      .map(({ item }) => item.protocol)
      .filter((protocol): protocol is string => Boolean(protocol)),
  );
  const byProtocol = [...protocols].map((protocol) => ({
    protocol,
    value: valuations
      .filter(({ item }) => item.protocol === protocol)
      .reduce((sum, row) => sum.plus(valueOf(row)), zero)
      .toFixed(),
  }));
  const valuationDetails = valuations.map(({ item, value, quote }) => ({
    asset: item.assetId,
    value: value?.toFixed() ?? null,
    source: quote?.source ?? item.valuationSource ?? null,
    timestamp: quote?.timestamp ?? item.valuationTimestamp ?? null,
    stale: quote?.stale ?? item.valuationStale ?? null,
  }));
  return {
    grossAssetValue: gross.toFixed(),
    liabilities: debt.toFixed(),
    netPortfolioValue: gross.minus(debt).toFixed(),
    availableLiquidity: liquidity.toFixed(),
    estimatedPortfolioYield,
    yieldBearingAssets: yieldAssets.toFixed(),
    rwaExposure: rwa.toFixed(),
    defiExposure: defi.toFixed(),
    unpricedAssets: valuations
      .filter(({ value }) => value === null)
      .map(({ item }) => item.assetId),
    byAsset,
    byCategory,
    byProtocol,
    valuations: valuationDetails,
    liabilityValuations: liabilities.map((item) => ({
      id: item.id,
      protocol: item.protocol,
      value: new Decimal(item.value).toFixed(),
      source: item.source ?? null,
      freshness: item.freshness ?? null,
    })),
    freshness,
  };
}
