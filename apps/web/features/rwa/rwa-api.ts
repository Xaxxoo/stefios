import { api } from '../../lib/api/client';

export type RwaRecord = {
  assetId: string;
  network: 'testnet' | 'mainnet';
  assetType: string;
  assetCode: string | null;
  contractAddress: string | null;
  issuer: string | null;
  manager: string | null;
  productName: string | null;
  instrumentType: string | null;
  jurisdiction: string | null;
  denomination: string | null;
  underlyingAssetCategory: string | null;
  nav: string | null;
  navTimestamp: string | null;
  indicatedYield: string | null;
  yieldTimestamp: string | null;
  maturity: string | null;
  duration: string | null;
  transferRestrictions: string | null;
  eligibilityRequirements: string | null;
  officialUrl: string | null;
  disclosuresUrl: string | null;
  source: string | null;
  freshness: string | null;
  verification: 'verified' | 'unverified' | 'unknown';
};

export const rwaApi = {
  list: (network: string) => api.get<readonly RwaRecord[]>(`/rwa?network=${network}&limit=100`),
  get: (assetId: string) => api.get<RwaRecord>(`/rwa/${encodeURIComponent(assetId)}`),
};
