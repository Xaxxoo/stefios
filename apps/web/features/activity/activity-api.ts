import { api } from '../../lib/api/client';

export type ActivityItem = {
  hash: string;
  type: 'payment' | 'swap' | 'defi' | 'rwa' | 'anchor' | 'cross-chain' | 'transaction';
  status: 'pending' | 'confirmed' | 'failed' | 'unknown';
  timestamp: string | null;
  source: string | null;
  summary: string;
  fee: string | null;
  network: string;
  protocol: string | null;
  operations: readonly { type: string; source: string | null; index: number }[];
  payments: readonly {
    from: string;
    to: string;
    amount: string;
    asset: string;
    memo: string | null;
  }[];
  explorerUrl: string;
};
export const activityApi = {
  list: (address: string, network: string) =>
    api.get<readonly ActivityItem[]>(`/activity/${encodeURIComponent(address)}?network=${network}`),
  detail: (hash: string) => api.get<ActivityItem>(`/transactions/${encodeURIComponent(hash)}`),
};
