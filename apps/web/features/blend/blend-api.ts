import { api } from '../../lib/api/client';

export type BlendReserve = {
  asset: {
    network: string;
    type: string;
    contractAddress?: string;
    assetCode?: string;
    issuerAddress?: string;
  };
  decimals: number;
  totalSupply: string;
  totalBorrow: string;
  supplyApr: string | null;
  supplyApy: string | null;
  borrowApr: string | null;
  borrowApy: string | null;
  utilization: string | null;
  incentives: readonly { kind: string; token: unknown; rate: string | null; source: string }[];
};
export type BlendMarket = {
  id: string;
  name: string;
  network: string;
  enabled: boolean;
  reserves?: readonly BlendReserve[];
};
export type BlendPosition = {
  id: string;
  marketId: string | null;
  kind: string;
  assets: readonly { amount: string; asset: unknown }[];
  healthRatio: string | null;
  rewards?: readonly { amount: string; token: unknown }[];
};
export type BlendYield = {
  market: string;
  apy: string;
  tvl: { currency: string; amount: string } | null;
  risk: string;
};
export type BlendRisk = {
  name: string;
  value: string;
  unit: string;
  severity: string;
  marketId: string | null;
};

export const blendApi = {
  markets: (network: string) =>
    api.get<readonly BlendMarket[]>(`/protocols/blend/markets?network=${network}`),
  positions: (address: string, network: string) =>
    api.get<readonly BlendPosition[]>(
      `/protocols/blend/positions/${encodeURIComponent(address)}?network=${network}`,
    ),
  yield: (network: string) =>
    api.get<readonly BlendYield[]>(`/protocols/blend/yield?network=${network}`),
  risk: (address: string, network: string) =>
    api.get<readonly BlendRisk[]>(
      `/protocols/blend/risk/${encodeURIComponent(address)}?network=${network}`,
    ),
};
