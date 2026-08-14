'use client';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { useSession } from '../../lib/session/context';
import { watchlistApi, type WatchlistTargetType } from './watchlist-api';
export function WatchlistPage() {
  const { session } = useSession();
  const client = useQueryClient();
  const [type, setType] = useState<WatchlistTargetType>('asset');
  const [target, setTarget] = useState('');
  const query = useQuery({
    queryKey: ['watchlist'],
    queryFn: watchlistApi.list,
    enabled: Boolean(session),
  });
  const add = useMutation({
    mutationFn: () => watchlistApi.add({ targetType: type, targetRef: target }),
    onSuccess: () => {
      setTarget('');
      void client.invalidateQueries({ queryKey: ['watchlist'] });
    },
  });
  const remove = useMutation({
    mutationFn: watchlistApi.remove,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['watchlist'] }),
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to manage your watchlist"
        description="Watchlist entries are private to your authenticated session."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Watchlist"
        description="Keep canonical assets, RWAs, DeFi markets, and yield opportunities close to your operating view."
        actions={<StatusBadge tone="info">{query.data?.length ?? 0} tracked</StatusBadge>}
      />
      <Card className="p-5">
        <SectionHeader
          title="Add to watchlist"
          description="Use canonical IDs or market identifiers; ticker symbols alone are not identity."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-[180px_1fr_auto]">
          <select
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={type}
            onChange={(event) =>
              setType((event.currentTarget as unknown as { value: WatchlistTargetType }).value)
            }
          >
            <option value="asset">Asset</option>
            <option value="rwa">RWA</option>
            <option value="defi_market">DeFi market</option>
            <option value="yield_opportunity">Yield opportunity</option>
          </select>
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={target}
            onChange={(event) =>
              setTarget((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="canonical asset or market ID"
          />
          <button
            className="rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={!target || add.isPending}
            onClick={() => add.mutate()}
          >
            {add.isPending ? 'Adding…' : 'Add'}
          </button>
        </div>
        {add.error ? (
          <p className="mt-3 text-sm text-rose-200">
            {add.error instanceof Error ? add.error.message : 'Could not add item'}
          </p>
        ) : null}
      </Card>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : query.error ? (
        <ErrorState
          title="Watchlist unavailable"
          description="Could not load your tracked items."
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
        <div className="grid gap-3 md:grid-cols-2">
          {query.data.map((item) => (
            <Card className="flex items-center justify-between gap-3 p-4" key={item.id}>
              <div>
                <StatusBadge tone="info">{item.targetType.replaceAll('_', ' ')}</StatusBadge>
                <p className="mt-3 break-all font-mono text-sm">{item.targetRef}</p>
              </div>
              <button
                className="rounded-md border border-white/10 px-3 py-2 text-xs"
                onClick={() => remove.mutate(item.id)}
              >
                Remove
              </button>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="Your watchlist is empty"
            description="Add a canonical asset, RWA, DeFi market, or yield opportunity above."
          />
        </Card>
      )}
    </div>
  );
}
