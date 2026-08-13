'use client';
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';
import { api } from '../api/client';
import { SessionExpiredError } from '../api/errors';

export interface ApplicationSession {
  id: string;
  userId: string;
  accountAddress: string;
  network: string;
  expiresAt: string;
}
interface SessionContextValue {
  session: ApplicationSession | null;
  loading: boolean;
  refresh(): Promise<void>;
  clear(): void;
}
const SessionContext = createContext<SessionContextValue | undefined>(undefined);
export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ApplicationSession | null>(null);
  const [loading, setLoading] = useState(true);
  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setSession(await api.get<ApplicationSession>('/auth/session'));
    } catch (error) {
      if (error instanceof SessionExpiredError || error instanceof Error) setSession(null);
    } finally {
      setLoading(false);
    }
  }, []);
  const value = useMemo(
    () => ({ session, loading, refresh, clear: () => setSession(null) }),
    [loading, refresh, session],
  );
  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}
export const useSession = () => {
  const value = useContext(SessionContext);
  if (!value) throw new Error('useSession must be used within SessionProvider');
  return value;
};
