import { api } from '../../lib/api/client';
export type WatchlistTargetType = 'asset' | 'rwa' | 'defi_market' | 'yield_opportunity';
export type WatchlistItem = {
  id: string;
  targetType: WatchlistTargetType;
  targetRef: string;
  assetId: string | null;
  createdAt: string;
};
export const watchlistApi = {
  list: () => api.get<readonly WatchlistItem[]>('/watchlist'),
  add: (body: { targetType: WatchlistTargetType; targetRef: string; assetId?: string }) =>
    api.post<WatchlistItem>('/watchlist', body),
  remove: (id: string) => api.delete<{ ok: true }>(`/watchlist/${encodeURIComponent(id)}`),
};
