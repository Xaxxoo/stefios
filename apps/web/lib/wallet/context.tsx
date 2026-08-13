'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { toast } from 'sonner';
import { api } from '../api/client';
import { clientEnv } from '../config/env';
import { useSession } from '../session/context';
import { createFreighterAdapter } from './freighter';
import type { StellarNetwork, WalletAdapter } from './types';

interface WalletContextValue {
  adapter: WalletAdapter | null;
  address: string | null;
  network: StellarNetwork | null;
  connecting: boolean;
  error: string | null;
  connect(adapter?: WalletAdapter): Promise<void>;
  disconnect(): Promise<void>;
  signTransaction(transactionXdr: string): Promise<string>;
}
const WalletContext = createContext<WalletContextValue | undefined>(undefined);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [adapter, setAdapter] = useState<WalletAdapter | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const [network, setNetwork] = useState<StellarNetwork | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { refresh } = useSession();

  const authenticate = useCallback(
    async (next: WalletAdapter, accountAddress: string, walletNetwork: StellarNetwork) => {
      const browser = globalThis as typeof globalThis & { location?: { host: string } };
      const domain = browser.location?.host ?? 'localhost';
      const challenge = await api.post<{ challengeId: string; message: string }>(
        '/auth/challenge',
        { accountAddress, network: walletNetwork, domain },
      );
      const signature = await next.signAuthenticationChallenge(challenge.message, walletNetwork);
      await api.post('/auth/verify', {
        challengeId: challenge.challengeId,
        signature,
        accountAddress,
        network: walletNetwork,
        domain,
      });
      await refresh();
    },
    [refresh],
  );

  const connect = useCallback(
    async (next = createFreighterAdapter()) => {
      setConnecting(true);
      setError(null);
      try {
        if (!(await next.isAvailable()))
          throw new Error(`${next.name} is unavailable or has not granted access`);
        await next.connect();
        const [accountAddress, walletNetwork] = await Promise.all([
          next.getPublicKey(),
          next.getNetwork(),
        ]);
        const expectedNetwork = clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
        if (walletNetwork !== expectedNetwork)
          throw new Error(`Network mismatch. Financial OS is configured for ${expectedNetwork}.`);
        setAdapter(next);
        setAddress(accountAddress);
        setNetwork(walletNetwork);
        await authenticate(next, accountAddress, walletNetwork);
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : 'Wallet connection failed';
        setError(message);
        toast.error(message);
        setAdapter(null);
        setAddress(null);
        setNetwork(null);
        throw caught;
      } finally {
        setConnecting(false);
      }
    },
    [authenticate],
  );

  useEffect(() => {
    if (!adapter) return;
    const unsubscribeAccount = adapter.onAccountChanged((nextAddress) => {
      setAddress(nextAddress);
      void authenticate(
        adapter,
        nextAddress,
        network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK,
      ).catch(() => undefined);
    });
    const unsubscribeNetwork = adapter.onNetworkChanged((nextNetwork) => setNetwork(nextNetwork));
    return () => {
      unsubscribeAccount();
      unsubscribeNetwork();
    };
  }, [adapter, authenticate, network]);
  const disconnect = useCallback(async () => {
    await adapter?.disconnect();
    await api.post('/auth/logout', {});
    setAdapter(null);
    setAddress(null);
    setNetwork(null);
    await refresh();
  }, [adapter, refresh]);
  const signTransaction = useCallback(
    async (transactionXdr: string) => {
      if (!adapter || !network) throw new Error('Connect a wallet before signing');
      return adapter.signTransaction(transactionXdr, network);
    },
    [adapter, network],
  );
  const value = useMemo(
    () => ({ adapter, address, network, connecting, error, connect, disconnect, signTransaction }),
    [adapter, address, network, connecting, error, connect, disconnect, signTransaction],
  );
  return <WalletContext.Provider value={value}>{children}</WalletContext.Provider>;
}
export const useWallet = () => {
  const value = useContext(WalletContext);
  if (!value) throw new Error('useWallet must be used within WalletProvider');
  return value;
};
