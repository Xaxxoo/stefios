import { api } from '../../lib/api/client';

export type DefiPosition = {
  id: string;
  protocol: 'blend' | 'aquarius' | 'sushi' | 'templar';
  marketId: string | null;
  kind: 'supply' | 'borrow' | 'liquidity' | 'reward';
  value: { amount: string; currency: string } | null;
  healthRatio: string | null;
  lifecycleState?: string | null;
  asOf: string;
};
export type DefiSummary = {
  totalSupplied: string;
  totalBorrowed: string;
  totalLiquidity: string;
  netDeFiValue: string;
  earnedYield: string | null;
  claimableRewards: { count: number; value: string | null };
  protocolAllocation: readonly { protocol: string; value: string }[];
  positionHealth: readonly {
    name: string;
    value: string;
    unit: string;
    severity: string;
    protocol: string;
  }[];
  positions: readonly DefiPosition[];
  providers: readonly { protocol: string; status: string; reason?: string }[];
  asOf: string;
};
export const defiApi = {
  summary: (address: string, network: string) =>
    api.get<DefiSummary>(`/defi/${encodeURIComponent(address)}?network=${network}`),
};
