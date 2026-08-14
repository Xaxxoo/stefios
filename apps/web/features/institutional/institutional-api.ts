import { api } from '../../lib/api/client';
export type InstitutionalOverview = {
  asOf: string;
  accountCount: number;
  signableAccountCount: number;
  viewOnlyAccountCount: number;
  nav: {
    grossAssetValue: string;
    liabilities: string;
    netPortfolioValue: string;
    availableLiquidity: string;
    yieldBearingAssets: string;
    estimatedPortfolioYield: string | null;
  };
  exposure: {
    rwa: string;
    defi: string;
    byCategory: readonly Record<string, string>[];
    byProtocol: readonly Record<string, string>[];
    byIssuer: readonly { issuer: string; value: string }[];
  };
  risk: {
    scores: readonly { address: string; score: string | null; severity: string | null }[];
    methodology: string;
  };
  groups: readonly { name: string; accounts: readonly string[]; netPortfolioValue: string }[];
  accounts: readonly {
    address: string;
    network: string;
    label: string | null;
    accountGroup: string | null;
    access: 'VIEW_ONLY_ACCOUNT' | 'CONNECTED_SIGNABLE_ACCOUNT';
    lastSyncAt: string | null;
    status: string;
    portfolio: {
      netPortfolioValue: string;
      availableLiquidity: string;
      rwaExposure: string;
      defiExposure: string;
      freshness: string;
    } | null;
  }[];
  transactionHistory: readonly {
    hash: string;
    network: string;
    status: string;
    ledgerTimestamp: string | null;
    accountId: string;
  }[];
};
export const institutionalApi = {
  overview: () => api.get<InstitutionalOverview>('/institutional'),
};
