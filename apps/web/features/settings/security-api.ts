import { api } from '../../lib/api/client';
export type SecuritySession = {
  id: string;
  userId: string;
  network: string;
  createdAt: string;
  expiresAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
  userAgent: string | null;
  ipAddress: string | null;
};
export type SecurityPreferences = {
  requireTransactionReview: boolean;
  showSimulationWarnings: boolean;
  trustedApplicationOrigin: string;
};
export const securityApi = {
  sessions: () => api.get<readonly SecuritySession[]>('/auth/sessions'),
  revoke: (id: string) => api.delete<{ ok: true }>(`/auth/sessions/${encodeURIComponent(id)}`),
  preferences: () => api.get<SecurityPreferences>('/auth/security/preferences'),
  updatePreferences: (
    body: Partial<Pick<SecurityPreferences, 'requireTransactionReview' | 'showSimulationWarnings'>>,
  ) => api.patch<SecurityPreferences>('/auth/security/preferences', body),
};
