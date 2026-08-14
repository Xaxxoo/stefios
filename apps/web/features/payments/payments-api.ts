import { api } from '../../lib/api/client';
import type { ActivityItem } from '../activity/activity-api';
export const paymentsApi = {
  activity: (address: string, network: string) =>
    api.get<readonly ActivityItem[]>(`/activity/${encodeURIComponent(address)}?network=${network}`),
};
