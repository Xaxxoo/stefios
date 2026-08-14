import { api } from '../../lib/api/client';
export type AlertType =
  | 'price_threshold'
  | 'yield_threshold'
  | 'health_deterioration'
  | 'liquidation_risk'
  | 'concentration_threshold'
  | 'cross_chain_completed'
  | 'cross_chain_failed'
  | 'anchor_transaction_change';
export type AlertRule = {
  id: string;
  type: AlertType;
  conditions: Record<string, unknown> | null;
  enabled: boolean;
  cooldownSeconds: number;
  lastTriggeredAt: string | null;
  createdAt: string;
};
export const alertsApi = {
  list: () => api.get<readonly AlertRule[]>('/alerts'),
  create: (body: {
    type: AlertType;
    conditions: Record<string, unknown>;
    cooldownSeconds?: number;
  }) => api.post<AlertRule>('/alerts', body),
  update: (
    id: string,
    body: Partial<Pick<AlertRule, 'enabled' | 'conditions' | 'cooldownSeconds'>>,
  ) => api.patch<AlertRule>(`/alerts/${encodeURIComponent(id)}`, body),
  remove: (id: string) => api.delete<{ ok: true }>(`/alerts/${encodeURIComponent(id)}`),
};
