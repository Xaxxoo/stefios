import { api } from '../../lib/api/client';

export type PortfolioAllocation = {
  asset: string;
  symbol: string | null;
  value: string | null;
  price: string | null;
  source: string | null;
  timestamp: string | null;
  stale: boolean | null;
};

export type Portfolio = {
  address: string;
  network: 'testnet' | 'mainnet';
  grossAssetValue: string;
  liabilities: string;
  netPortfolioValue: string;
  availableLiquidity: string;
  estimatedPortfolioYield: string | null;
  yieldBearingAssets: string;
  rwaExposure: string;
  defiExposure: string;
  unpricedAssets: readonly string[];
  byAsset: readonly PortfolioAllocation[];
  byCategory: readonly { category: string; value: string }[];
  byProtocol: readonly { protocol: string; value: string }[];
  valuations: readonly Record<string, unknown>[];
  liabilityValuations: readonly Record<string, unknown>[];
  freshness: 'fresh' | 'stale' | 'mixed' | 'unknown';
  asOf: string;
};

export type PortfolioSnapshot = {
  id: string;
  snapshotAt: string;
  totalValue: string;
  quoteCurrency: string;
  providerMetadata: { freshness?: string } | null;
};

export type SyncStatus = {
  address: string;
  network: string;
  streams: readonly {
    stream: string;
    status: string;
    updatedAt: string | null;
    error: string | null;
  }[];
};

export const dashboardApi = {
  portfolio: (address: string, network: string) =>
    api.get<Portfolio>(`/portfolio/${encodeURIComponent(address)}?network=${network}`),
  allocation: (address: string, network: string) =>
    api.get<Pick<Portfolio, 'byAsset' | 'byCategory' | 'byProtocol' | 'freshness'>>(
      `/portfolio/${encodeURIComponent(address)}/allocation?network=${network}`,
    ),
  history: (address: string, network: string) =>
    api.get<readonly PortfolioSnapshot[]>(
      `/portfolio/${encodeURIComponent(address)}/history?network=${network}&limit=90`,
    ),
  syncStatus: (address: string, network: string) =>
    api.get<SyncStatus>(`/wallets/${encodeURIComponent(address)}/sync-status?network=${network}`),
  sync: (address: string, network: string) =>
    api.post<{ jobId: string; status: string }>(
      `/wallets/${encodeURIComponent(address)}/sync?network=${network}`,
      {},
    ),
};
