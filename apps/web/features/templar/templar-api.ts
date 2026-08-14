import { api } from '../../lib/api/client';

export type TemplarStatus = {
  status: 'available' | 'unavailable';
  source: string;
  reason: string | null;
};
export type TemplarPosition = {
  id: string;
  marketId: string | null;
  collateral?: readonly { asset: unknown; amount: string }[];
  collateralValue?: { amount: string; currency: string } | null;
  borrowed?: readonly { asset: unknown; amount: string }[];
  borrowedValue?: { amount: string; currency: string } | null;
  ltv: string | null;
  liquidationThreshold: string | null;
  health: string | null;
  borrowRate: string | null;
  positionStatus: string | null;
  lifecycleState: string;
  operationId: string | null;
};
export type TemplarRisk = {
  name: string;
  value: string;
  unit: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
};

export const templarApi = {
  status: (network: string) =>
    api.get<TemplarStatus>(`/protocols/blend/templar/status?network=${network}`),
  markets: (network: string) =>
    api.get<readonly unknown[]>(`/protocols/blend/templar/markets?network=${network}`),
  positions: (address: string, network: string) =>
    api.get<readonly TemplarPosition[]>(
      `/protocols/blend/templar/positions/${encodeURIComponent(address)}?network=${network}`,
    ),
  risk: (address: string, network: string) =>
    api.get<readonly TemplarRisk[]>(
      `/protocols/blend/templar/risk/${encodeURIComponent(address)}?network=${network}`,
    ),
};
