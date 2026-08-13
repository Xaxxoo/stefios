'use client';
import { QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { createQueryClient } from '../lib/query/client';
import { SessionProvider } from '../lib/session/context';
import { WalletProvider } from '../lib/wallet/context';
import { Toaster } from 'sonner';

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <WalletProvider>
          {children}
          <Toaster richColors />
        </WalletProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
