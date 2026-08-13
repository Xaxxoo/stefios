export const SYNC_QUEUE = 'account-sync';
export const SYNC_JOB_NAMES = {
  account: 'sync-account',
  balances: 'sync-balances',
  transactions: 'sync-transactions',
  tokenBalances: 'sync-token-balances',
  protocolPositions: 'sync-protocol-positions',
} as const;

export type SyncJobName = (typeof SYNC_JOB_NAMES)[keyof typeof SYNC_JOB_NAMES];

export interface SyncJobPayload {
  network: 'testnet' | 'mainnet';
  address: string;
  requestedBy?: string;
}
