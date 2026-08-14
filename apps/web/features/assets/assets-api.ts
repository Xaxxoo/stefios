import { api } from '../../lib/api/client';

export type AssetRecord = {
  assetId: string;
  network: 'testnet' | 'mainnet';
  type: 'native' | 'classic' | 'contract';
  decimals: string;
  symbol?: string;
  name?: string;
  logo?: string;
  issuer?: string;
  contract?: string;
  domain?: string;
  category?: string;
  verification: 'verified' | 'unverified' | 'unknown';
  description?: string;
  links: readonly string[];
};

export const assetsApi = {
  list: (network: string, category?: string) =>
    api.get<readonly AssetRecord[]>(
      `/assets?network=${network}${category ? `&category=${encodeURIComponent(category)}` : ''}`,
    ),
  search: (query: string, network: string) =>
    api.get<readonly AssetRecord[]>(
      `/assets/search?q=${encodeURIComponent(query)}&network=${network}`,
    ),
  get: (assetId: string) => api.get<AssetRecord>(`/assets/${encodeURIComponent(assetId)}`),
  metadata: (assetId: string) =>
    api.get<AssetRecord>(`/assets/${encodeURIComponent(assetId)}/metadata`),
};
