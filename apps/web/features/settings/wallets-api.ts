import { api } from '../../lib/api/client';
export type WalletRecord = {
  id: string;
  address: string;
  network: 'testnet' | 'mainnet';
  provider: string;
  label: string | null;
  accountGroup: string | null;
  access: 'VIEW_ONLY_ACCOUNT' | 'CONNECTED_SIGNABLE_ACCOUNT';
  isViewOnly: boolean;
  lastSeenAt: string | null;
  lastSyncAt: string | null;
};
export const walletsApi = {
  list: (network?: string) =>
    api.get<readonly WalletRecord[]>(`/wallets${network ? `?network=${network}` : ''}`),
  addViewOnly: (body: {
    address: string;
    network: string;
    label?: string;
    accountGroup?: string;
  }) =>
    api.post<{ address: string; network: string; access: string; sync: unknown }>(
      '/wallets/view-only',
      body,
    ),
  sync: (address: string, network: string) =>
    api.post<{ jobId: string; status: string }>(
      `/wallets/${encodeURIComponent(address)}/sync?network=${network}`,
      {},
    ),
  update: (address: string, network: string, body: { label?: string; accountGroup?: string }) =>
    api.patch<WalletRecord>(`/wallets/${encodeURIComponent(address)}?network=${network}`, body),
  remove: (address: string, network: string) =>
    api.delete<{ ok: true }>(`/wallets/${encodeURIComponent(address)}?network=${network}`),
};
