import Decimal from 'decimal.js';

export type RiskSeverity = 'low' | 'medium' | 'high' | 'critical' | 'unknown';
export type RiskCategory =
  | 'assetConcentration'
  | 'issuerConcentration'
  | 'protocolConcentration'
  | 'rwaManagerExposure'
  | 'stablecoinExposure'
  | 'unpricedExposure'
  | 'liquidity'
  | 'stalePricing'
  | 'defiHealth'
  | 'liquidationProximity'
  | 'borrowUtilization'
  | 'smartContractExposure'
  | 'crossChainPendingExposure';

export type RiskPortfolioInput = {
  grossAssetValue: string;
  liabilities: string;
  availableLiquidity: string;
  unpricedAssets: readonly string[];
  freshness: 'fresh' | 'stale' | 'mixed' | 'unknown';
  byAsset: readonly {
    asset: string;
    category: string;
    value: string | null;
    protocol: string | null;
  }[];
  byCategory: readonly { category: string; value: string }[];
  byProtocol: readonly { protocol: string; value: string }[];
  positionHealth: readonly { name: string; value: string; severity: string; protocol?: string }[];
};
export type RiskSignal = {
  category: RiskCategory;
  score: string | null;
  severity: RiskSeverity;
  explanation: string;
  possibleMitigation: string;
  known: boolean;
};
export type RiskHeatmapRow = {
  label: string;
  kind: 'asset' | 'protocol' | 'position';
  cells: Readonly<
    Record<
      | 'concentration'
      | 'liquidity'
      | 'market'
      | 'issuer'
      | 'protocol'
      | 'liquidation'
      | 'dataQuality',
      RiskSeverity
    >
  >;
};
export type PortfolioRisk = {
  overallScore: string | null;
  severity: RiskSeverity;
  explanation: string;
  possibleMitigation: string;
  signals: readonly RiskSignal[];
  heatmap: readonly RiskHeatmapRow[];
  methodology: readonly { category: RiskCategory; formula: string; interpretation: string }[];
  asOf: string;
};

const d = (value: string) => new Decimal(value);
const clamp = (value: Decimal) => Decimal.max(0, Decimal.min(100, value));
function severity(score: Decimal | null): RiskSeverity {
  if (score === null) return 'unknown';
  if (score.greaterThanOrEqualTo(80)) return 'critical';
  if (score.greaterThanOrEqualTo(60)) return 'high';
  if (score.greaterThanOrEqualTo(35)) return 'medium';
  return 'low';
}
function signal(
  category: RiskCategory,
  score: Decimal | null,
  explanation: string,
  possibleMitigation: string,
): RiskSignal {
  return {
    category,
    score: score?.toFixed(2) ?? null,
    severity: severity(score),
    explanation,
    possibleMitigation,
    known: score !== null,
  };
}
function maxConcentration(values: readonly { value: string }[], total: Decimal): Decimal | null {
  if (values.length === 0 || total.isZero()) return null;
  const largest = values.reduce((max, row) => Decimal.max(max, d(row.value)), new Decimal(0));
  return clamp(largest.div(total).times(100));
}
function exposureRisk(exposure: Decimal | null): Decimal | null {
  return exposure === null ? null : clamp(exposure.times(100));
}
function healthScore(health: RiskPortfolioInput['positionHealth']): Decimal | null {
  if (!health.length) return null;
  const scores = health.map((item) =>
    item.severity === 'critical'
      ? 95
      : item.severity === 'high'
        ? 75
        : item.severity === 'medium'
          ? 45
          : item.severity === 'low'
            ? 10
            : 50,
  );
  return new Decimal(Math.max(...scores));
}
function heatSeverity(score: Decimal | null): RiskSeverity {
  return severity(score);
}

export function calculatePortfolioRisk(input: RiskPortfolioInput): PortfolioRisk {
  const gross = d(input.grossAssetValue);
  const liabilities = d(input.liabilities);
  const priced = input.byAsset.filter(
    (row): row is typeof row & { value: string } => row.value !== null,
  );
  const assetConcentration = maxConcentration(priced, gross);
  const issuerRows = priced
    .filter((row) => row.asset.includes(':classic:'))
    .map((row) => ({ value: row.value, issuer: row.asset.split(':').at(-1) ?? 'unknown' }));
  const issuerGroups = [...new Set(issuerRows.map((row) => row.issuer))].map((issuer) => ({
    value: issuerRows
      .filter((row) => row.issuer === issuer)
      .reduce((sum, row) => sum.plus(d(row.value)), new Decimal(0))
      .toFixed(),
  }));
  const issuerConcentration = maxConcentration(issuerGroups, gross);
  const protocolConcentration = maxConcentration(input.byProtocol, gross);
  const rwa = input.byCategory.find((row) => ['rwa', 'fund'].includes(row.category.toLowerCase()));
  const stablecoins = input.byCategory.find((row) =>
    ['stablecoin', 'stablecoins'].includes(row.category.toLowerCase()),
  );
  const unpricedValue = gross.minus(
    priced.reduce((sum, row) => sum.plus(d(row.value)), new Decimal(0)),
  );
  const signals: RiskSignal[] = [
    signal(
      'assetConcentration',
      assetConcentration,
      assetConcentration === null
        ? 'Asset values are unavailable for concentration analysis.'
        : 'Score reflects the largest priced asset share of gross assets.',
      'Diversify large single-asset exposures where appropriate.',
    ),
    signal(
      'issuerConcentration',
      issuerConcentration,
      issuerConcentration === null
        ? 'No canonical classic issuer exposure was available.'
        : 'Score reflects the largest known classic issuer share.',
      'Review issuer and counterparty diversification.',
    ),
    signal(
      'protocolConcentration',
      protocolConcentration,
      protocolConcentration === null
        ? 'No valued protocol exposure was available.'
        : 'Score reflects the largest protocol share of gross assets.',
      'Spread positions across protocols only when their risks and liquidity are understood.',
    ),
    signal(
      'rwaManagerExposure',
      rwa && gross.gt(0) ? exposureRisk(d(rwa.value).div(gross)) : null,
      rwa
        ? 'Manager-level attribution is unavailable; this is only total RWA exposure.'
        : 'No RWA manager exposure was identified.',
      'Inspect manager, issuer, disclosures, and restrictions before relying on RWA diversification.',
    ),
    signal(
      'stablecoinExposure',
      stablecoins && gross.gt(0) ? exposureRisk(d(stablecoins.value).div(gross)) : null,
      stablecoins
        ? 'Score reflects total stablecoin concentration, not a claim of parity or safety.'
        : 'Stablecoin exposure was not identified.',
      'Diversify stablecoin and issuer exposure and monitor reserve/liquidity information.',
    ),
    signal(
      'unpricedExposure',
      gross.gt(0) ? exposureRisk(unpricedValue.div(gross)) : null,
      input.unpricedAssets.length
        ? `${input.unpricedAssets.length} asset(s) have no trusted valuation.`
        : 'No unpriced assets were reported.',
      'Avoid treating unpriced assets as zero risk; obtain a source-aware valuation or cap exposure.',
    ),
    signal(
      'liquidity',
      gross.gt(0)
        ? clamp(new Decimal(100).minus(d(input.availableLiquidity).div(gross).times(100)))
        : null,
      gross.gt(0)
        ? 'Score increases as available wallet liquidity falls relative to gross assets.'
        : 'Liquidity ratio is unavailable.',
      'Maintain liquidity appropriate for withdrawals, obligations, and volatility.',
    ),
    signal(
      'stalePricing',
      input.freshness === 'fresh'
        ? new Decimal(0)
        : input.freshness === 'stale'
          ? new Decimal(90)
          : input.freshness === 'mixed'
            ? new Decimal(50)
            : null,
      `Pricing freshness is ${input.freshness}.`,
      'Refresh prices and avoid decisions based on stale valuations.',
    ),
    signal(
      'defiHealth',
      healthScore(input.positionHealth),
      input.positionHealth.length
        ? 'Score uses the most severe provider-reported DeFi health signal.'
        : 'No DeFi health metrics were available.',
      'Review protocol health, collateral, and debt before adding leverage.',
    ),
    signal(
      'liquidationProximity',
      healthScore(input.positionHealth),
      input.positionHealth.length
        ? 'Liquidation proximity uses available protocol health severity; exact distance may be unavailable.'
        : 'Liquidation proximity is unknown without position health.',
      'Reduce borrow exposure or add collateral if liquidation risk rises.',
    ),
    signal(
      'borrowUtilization',
      gross.gt(0) ? exposureRisk(liabilities.div(gross)) : null,
      'Score reflects liabilities relative to gross assets, not a protocol-specific utilization rate.',
      'Monitor debt service, collateral ratios, and borrowing costs.',
    ),
    signal(
      'smartContractExposure',
      gross.gt(0)
        ? exposureRisk(
            priced
              .filter((row) => row.asset.includes(':contract:'))
              .reduce((sum, row) => sum.plus(d(row.value)), new Decimal(0))
              .div(gross),
          )
        : null,
      'Score reflects priced contract-token exposure.',
      'Review contract provenance, upgradeability, audits, and integration boundaries.',
    ),
    signal(
      'crossChainPendingExposure',
      null,
      'Cross-chain pending exposure is not included in the current portfolio valuation response.',
      'Review pending transfer states before considering capital available or settled.',
    ),
  ];
  const known = signals.filter((item) => item.score !== null);
  const overall = known.length
    ? known.reduce((sum, item) => sum.plus(d(item.score!)), new Decimal(0)).div(known.length)
    : null;
  const heatmap = priced.slice(0, 20).map((row) => {
    const concentration = gross.gt(0) ? exposureRisk(d(row.value).div(gross)) : null;
    const dataQuality =
      row.value === null
        ? new Decimal(100)
        : input.freshness === 'fresh'
          ? new Decimal(0)
          : input.freshness === 'unknown'
            ? null
            : new Decimal(50);
    return {
      label: row.asset,
      kind: 'asset' as const,
      cells: {
        concentration: heatSeverity(concentration),
        liquidity: heatSeverity(
          signals.find((item) => item.category === 'liquidity')?.score
            ? d(signals.find((item) => item.category === 'liquidity')!.score!)
            : null,
        ),
        market: heatSeverity(
          signals.find((item) => item.category === 'stalePricing')?.score
            ? d(signals.find((item) => item.category === 'stalePricing')!.score!)
            : null,
        ),
        issuer: heatSeverity(row.asset.includes(':classic:') ? issuerConcentration : null),
        protocol: heatSeverity(row.protocol ? protocolConcentration : null),
        liquidation: heatSeverity(row.protocol ? healthScore(input.positionHealth) : null),
        dataQuality: heatSeverity(dataQuality),
      },
    };
  });
  const methodology = signals.map((item) => ({
    category: item.category,
    formula:
      item.category === 'crossChainPendingExposure'
        ? 'Not available'
        : 'Risk score = normalized exposure or severity from 0 to 100',
    interpretation: item.explanation,
  }));
  return {
    overallScore: overall?.toFixed(2) ?? null,
    severity: severity(overall),
    explanation:
      overall === null
        ? 'Risk cannot be scored because no trusted inputs are available.'
        : 'Overall score is an unweighted average of available category scores; unknown categories are excluded and remain visible.',
    possibleMitigation:
      'Use category-level signals and inspect the underlying heatmap before changing exposure. This is an analytical view, not financial advice.',
    signals,
    heatmap,
    methodology,
    asOf: new Date().toISOString(),
  };
}
