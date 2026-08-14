import { api } from '../../lib/api/client';

export type CrossChainState =
  | 'created'
  | 'awaiting_signature'
  | 'submitted'
  | 'source_confirmed'
  | 'bridging'
  | 'destination_confirmed'
  | 'completed'
  | 'failed'
  | 'recovery_required';
export type CrossChainTransfer = {
  id: string;
  provider: string;
  sourceChain: string;
  destinationChain: string;
  sourceAsset: string | null;
  destinationAsset: string | null;
  amount: string;
  sourceTransaction: string | null;
  destinationTransaction: string | null;
  fees: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  state: CrossChainState;
  error: string | null;
  recoveryState: string | null;
};
export const crossChainApi = {
  providers: () =>
    api.get<readonly { id: string; chains: readonly string[]; available: boolean }[]>(
      '/cross-chain/providers',
    ),
  list: () => api.get<readonly CrossChainTransfer[]>('/cross-chain'),
  get: (id: string) => api.get<CrossChainTransfer>(`/cross-chain/${encodeURIComponent(id)}`),
  refresh: (id: string) =>
    api.post<CrossChainTransfer>(`/cross-chain/${encodeURIComponent(id)}/refresh`, {}),
};
