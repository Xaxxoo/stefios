'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { paymentsApi } from './payments-api';

export function PaymentsPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const query = useQuery({
    queryKey: ['payments', address, network],
    queryFn: () => paymentsApi.activity(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to view payments"
        description="Payment history and preparation are account-specific. Financial OS never requests a private key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Money movement"
        title="Payments"
        description="Stellar native and issued-asset payments with confirmed-only activity status."
        actions={
          <div className="flex gap-2">
            <Link
              className="rounded-md border border-white/10 px-3 py-2 text-sm"
              href="/payments/receive"
            >
              Receive
            </Link>
            <Link
              className="rounded-md bg-[hsl(var(--accent))] px-3 py-2 text-sm font-medium text-black"
              href="/payments/send"
            >
              Send payment
            </Link>
          </div>
        }
      />
      <section className="space-y-3">
        <SectionHeader
          title="Payment activity"
          description="Pending transactions are never displayed as successful."
        />
        {query.isLoading ? (
          <Skeleton className="h-72" />
        ) : query.error ? (
          <ErrorState
            title="Payment activity unavailable"
            description="The synchronized activity feed could not be loaded."
            action={
              <button
                className="rounded-md border border-white/10 px-3 py-2 text-sm"
                onClick={() => void query.refetch()}
              >
                Retry
              </button>
            }
          />
        ) : query.data?.length ? (
          <div className="space-y-3">
            {query.data
              .filter((item) => item.type === 'payment')
              .map((item) => (
                <ActivityRow key={item.hash} item={item} />
              ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No payments yet"
              description="Confirmed Stellar payment activity will appear after synchronization."
            />
          </Card>
        )}
      </section>
    </div>
  );
}
function ActivityRow({ item }: { item: Awaited<ReturnType<typeof paymentsApi.activity>>[number] }) {
  return (
    <Link href={`/transactions/${item.hash}`} className="block">
      <Card className="p-4 transition hover:border-white/20">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="font-medium">{item.summary}</p>
            <p className="mt-1 text-xs text-[hsl(var(--muted))]">
              {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'Time unavailable'} ·{' '}
              {item.hash.slice(0, 10)}…
            </p>
          </div>
          <StatusBadge
            tone={
              item.status === 'confirmed'
                ? 'positive'
                : item.status === 'failed'
                  ? 'negative'
                  : 'warning'
            }
          >
            {item.status}
          </StatusBadge>
        </div>
        {item.payments[0] ? (
          <p className="mt-3 text-sm text-[hsl(var(--muted))]">
            {item.payments[0].amount} {item.payments[0].asset} to {item.payments[0].to}
          </p>
        ) : null}
      </Card>
    </Link>
  );
}
