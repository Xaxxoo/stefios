import { api } from '../../lib/api/client';

export type SushiStatus = {
  status: 'available' | 'unavailable';
  reason: string | null;
  source: string;
};
export type SushiMarket = {
  id: string;
  name: string;
  network: string;
  enabled: boolean;
  feeTier?: string | null;
  concentrated?: boolean;
  assets: readonly unknown[];
};
export type SushiPosition = {
  id: string;
  marketId: string | null;
  assets: readonly { asset: unknown; amount: string }[];
  priceRange?: { lower: string | null; upper: string | null; unit: string } | null;
  inRange?: boolean | null;
  fees?: readonly { asset: unknown; amount: string }[];
  apr?: string | null;
};
export type SushiYield = { market: string; apy: string; risk: string };

export const sushiApi = {
  status: (network: string) =>
    api.get<SushiStatus>(`/protocols/blend/sushi/status?network=${network}`),
  markets: (network: string) =>
    api.get<readonly SushiMarket[]>(`/protocols/blend/sushi/markets?network=${network}`),
  positions: (address: string, network: string) =>
    api.get<readonly SushiPosition[]>(
      `/protocols/blend/sushi/positions/${encodeURIComponent(address)}?network=${network}`,
    ),
  yield: (network: string) =>
    api.get<readonly SushiYield[]>(`/protocols/blend/sushi/yield?network=${network}`),
};
