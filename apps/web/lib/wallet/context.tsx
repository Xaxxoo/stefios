'use client';
import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import type { WalletAdapter } from './types';

interface WalletContextValue {
  adapter: WalletAdapter | null;
  address: string | null;
  connect(adapter: WalletAdapter): Promise<void>;
  disconnect(): Promise<void>;
}
const WalletContext = createContext<WalletContextValue | undefined>(undefined);
export function WalletProvider({ children }: { children: ReactNode }) {
  const [adapter, setAdapter] = useState<WalletAdapter | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const value = useMemo(
    () => ({
      adapter,
      address,
      connect: async (next: WalletAdapter) => {
        setAdapter(next);
        setAddress(await next.getPublicKey());
      },
      disconnect: async () => {
        await adapter?.disconnect?.();
        setAdapter(null);
        setAddress(null);
      },
    }),
    [adapter, address],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export const useWallet = () => {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used within WalletProvider');
  return value;
};
