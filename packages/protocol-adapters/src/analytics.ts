import Decimal from 'decimal.js';
import type { ProtocolAdapter } from './adapter';
import type {
  DeFiAggregation,
  NormalizedYieldOpportunity,
  ProtocolId,
  ProtocolPosition,
  ProtocolRiskMetrics,
  ProtocolYieldMetrics,
} from './types';

const ZERO = new Decimal(0);
const value = (position: ProtocolPosition) =>
  position.value?.amount == null ? null : new Decimal(position.value.amount);

export function aggregateDeFi(
  results: readonly {
    protocol: ProtocolId;
    positions?: readonly ProtocolPosition[];
    risk?: readonly ProtocolRiskMetrics[];
    error?: string;
  }[],
): DeFiAggregation {
  const positions = results.flatMap((result) => result.positions ?? []);
  const supplied = positions
    .filter((position) => position.kind === 'supply')
    .reduce((sum, position) => sum.plus(value(position) ?? ZERO), ZERO);
  const borrowed = positions
    .filter((position) => position.kind === 'borrow')
    .reduce((sum, position) => sum.plus(value(position) ?? ZERO), ZERO);
  const liquidity = positions
    .filter((position) => position.kind === 'liquidity')
    .reduce((sum, position) => sum.plus(value(position) ?? ZERO), ZERO);
  const rewards = positions.filter((position) => position.kind === 'reward');
  const rewardValue = rewards.every((position) => value(position) !== null)
    ? rewards.reduce((sum, position) => sum.plus(value(position) ?? ZERO), ZERO).toFixed()
    : null;
  const protocols = [...new Set(positions.map((position) => position.protocol))];
  const protocolAllocation = protocols.map((protocol) => ({
    protocol,
    value: positions
      .filter((position) => position.protocol === protocol)
      .reduce((sum, position) => {
        const positionValue = value(position) ?? ZERO;
        return position.kind === 'borrow' ? sum.minus(positionValue) : sum.plus(positionValue);
      }, ZERO)
      .toFixed(),
  }));
  return {
    totalSupplied: supplied.toFixed(),
    totalBorrowed: borrowed.toFixed(),
    totalLiquidity: liquidity.toFixed(),
    netDeFiValue: supplied.plus(liquidity).minus(borrowed).toFixed(),
    earnedYield: rewardValue,
    claimableRewards: { count: rewards.length, value: rewardValue },
    protocolAllocation,
    positionHealth: results.flatMap((result) => result.risk ?? []),
    positions,
    providers: results.map((result) => ({
      protocol: result.protocol,
      status: result.error ? 'unavailable' : 'available',
      ...(result.error ? { reason: result.error } : {}),
    })),
    asOf: new Date(),
  };
}

function riskCategory(value: string | undefined): NormalizedYieldOpportunity['riskCategory'] {
  return value === 'low' || value === 'medium' || value === 'high' ? value : 'unknown';
}

export function normalizeYieldOpportunity(
  protocol: ProtocolId,
  metric: ProtocolYieldMetrics,
): NormalizedYieldOpportunity {
  const timestamp = new Date(metric.asOf);
  const stale = Date.now() - timestamp.getTime() > 15 * 60 * 1000;
  return {
    asset: null,
    protocol,
    baseYield: metric.apy ?? null,
    rewardYield: null,
    totalEstimatedYield: metric.apy ?? null,
    methodology:
      'Provider-reported estimate; composition and reward attribution are not independently inferred.',
    timestamp,
    liquidityConsiderations: metric.tvl
      ? `TVL ${metric.tvl.amount} ${metric.tvl.currency}; exit liquidity is provider-dependent.`
      : 'Liquidity data unavailable.',
    riskCategory: riskCategory(metric.risk),
    rwaOrDefi: 'defi',
    source: metric.source,
    stale,
    market: metric.market,
  };
}

export async function collectYield(
  adapters: readonly ProtocolAdapter[],
  network: 'mainnet' | 'testnet',
): Promise<NormalizedYieldOpportunity[]> {
  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.getYieldMetrics(network)),
  );
  return results.flatMap((result, index) => {
    const adapter = adapters[index];
    if (!adapter || result.status !== 'fulfilled') return [];
    return result.value.map((metric) => normalizeYieldOpportunity(adapter.id, metric));
  });
}
