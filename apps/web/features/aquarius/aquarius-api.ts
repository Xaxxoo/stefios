import { api } from '../../lib/api/client';

export type AquariusMarket = {
  id: string;
  name: string;
  network: string;
  enabled: boolean;
  poolType?: string | null;
  fee?: string | null;
  assets: readonly unknown[];
};
export type AquariusPosition = {
  id: string;
  marketId: string | null;
  assets: readonly { asset: unknown; amount: string }[];
  rewards?: readonly { amount: string; token: unknown }[];
};
export type AquariusYield = { market: string; apy: string; risk: string };

export const aquariusApi = {
  markets: (network: string) =>
    api.get<readonly AquariusMarket[]>(`/protocols/blend/aquarius/markets?network=${network}`),
  positions: (address: string, network: string) =>
    api.get<readonly AquariusPosition[]>(
      `/protocols/blend/aquarius/positions/${encodeURIComponent(address)}?network=${network}`,
    ),
  yield: (network: string) =>
    api.get<readonly AquariusYield[]>(`/protocols/blend/aquarius/yield?network=${network}`),
};
