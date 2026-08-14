'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { activityApi } from './activity-api';

export function ActivityPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const query = useQuery({
    queryKey: ['activity', address, network],
    queryFn: () => activityApi.list(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to view activity"
        description="Activity is normalized from synchronized account, protocol, anchor, and cross-chain records."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Audit trail"
        title="Activity"
        description="Payments, swaps, DeFi, RWAs, anchors, and cross-chain activity in one timeline."
        actions={
          <StatusBadge tone={query.isFetching ? 'warning' : 'info'}>
            {query.isFetching ? 'Refreshing' : network}
          </StatusBadge>
        }
      />
      {query.isLoading ? (
        <Skeleton className="h-96" />
      ) : query.error ? (
        <ErrorState
          title="Activity unavailable"
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
          {query.data.map((item) => (
            <Link className="block" href={`/transactions/${item.hash}`} key={item.hash}>
              <Card className="p-4 transition hover:border-white/20">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-medium">{item.summary}</p>
                    <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                      {item.type} ·{' '}
                      {item.timestamp
                        ? new Date(item.timestamp).toLocaleString()
                        : 'Time unavailable'}{' '}
                      · {item.hash.slice(0, 12)}…
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
                <div className="mt-3 flex flex-wrap gap-3 text-xs text-[hsl(var(--muted))]">
                  <span>{item.operations.length} operations</span>
                  {item.protocol ? <span>Protocol: {item.protocol}</span> : null}
                  {item.fee ? <span>Fee: {item.fee}</span> : null}
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="No activity yet"
            description="Synchronized account activity will appear here."
          />
        </Card>
      )}
    </div>
  );
}
