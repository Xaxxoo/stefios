'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  RiskBadge,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { defiApi, type DefiPosition } from './defi-api';

const labels: Record<string, string> = {
  blend: 'Blend',
  aquarius: 'Aquarius',
  sushi: 'Sushi',
  templar: 'Templar',
};
const groups = ['supply', 'borrow', 'liquidity', 'reward'] as const;
function money(value: string | null | undefined) {
  return value == null ? '—' : value;
}

export function DefiPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const query = useQuery({
    queryKey: ['defi', address, network],
    queryFn: () => defiApi.summary(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to view DeFi"
        description="Financial OS aggregates lending, borrowing, liquidity, and rewards without handling private keys."
        action={<ConnectWalletButton />}
      />
    );
  if (query.isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
          <Skeleton className="h-28" />
        </div>
        <Skeleton className="h-72" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <ErrorState
        title="DeFi data unavailable"
        description="The protocol aggregation could not be loaded."
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => void query.refetch()}
          >
            Retry
          </button>
        }
      />
    );
  const data = query.data;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Open finance"
        title="DeFi command center"
        description="One view across Blend, Aquarius, Sushi, and Templar positions."
        actions={
          <StatusBadge tone={query.isFetching ? 'warning' : 'info'}>
            {query.isFetching ? 'Refreshing' : network}
          </StatusBadge>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Net DeFi value"
          value={money(data.netDeFiValue)}
          change="Source-aware total"
        />
        <MetricCard label="Total supplied" value={money(data.totalSupplied)} />
        <MetricCard label="Total borrowed" value={money(data.totalBorrowed)} tone="negative" />
        <MetricCard label="Total liquidity" value={money(data.totalLiquidity)} />
        <MetricCard
          label="Claimable rewards"
          value={data.claimableRewards.value ?? String(data.claimableRewards.count)}
          change={
            data.claimableRewards.value
              ? `${data.claimableRewards.count} positions`
              : 'Value unavailable'
          }
        />
      </div>
      <section className="space-y-3">
        <SectionHeader
          title="Position health"
          description="Borrowing health is prioritized; unavailable provider metrics remain explicit."
        />
        {data.positionHealth.length ? (
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            {data.positionHealth.map((item) => (
              <Card className="p-4" key={`${item.protocol}-${item.name}`}>
                <div className="flex items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted))]">
                    {labels[item.protocol] ?? item.protocol}
                  </p>
                  <RiskBadge
                    level={
                      item.severity === 'critical' ||
                      item.severity === 'high' ||
                      item.severity === 'medium'
                        ? item.severity
                        : 'low'
                    }
                  />
                </div>
                <p className="mt-3 text-xl font-semibold tabular-nums">
                  {item.value} {item.unit}
                </p>
                <p className="mt-1 text-xs text-[hsl(var(--muted))]">{item.name}</p>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="p-5">
            <EmptyState
              title="No health metrics"
              description="No protocol returned account-level health metrics."
            />
          </Card>
        )}
      </section>
      <div className="grid gap-8 xl:grid-cols-[1.2fr_.8fr]">
        <section className="space-y-3">
          <SectionHeader
            title="Positions by activity"
            description="Supply, borrow, liquidity, and reward positions."
          />
          {groups.map((group) => (
            <PositionGroup
              key={group}
              title={group}
              positions={data.positions.filter((position) => position.kind === group)}
            />
          ))}
        </section>
        <section className="space-y-3">
          <SectionHeader
            title="Protocol allocation"
            description="Net valued exposure by protocol; debt is subtracted."
          />
          <Card className="divide-y divide-white/[0.08]">
            {data.protocolAllocation.length ? (
              data.protocolAllocation.map((item) => (
                <div className="flex items-center justify-between p-4" key={item.protocol}>
                  <span>{labels[item.protocol] ?? item.protocol}</span>
                  <span className="tabular-nums">{item.value}</span>
                </div>
              ))
            ) : (
              <div className="p-5">
                <EmptyState
                  title="No protocol exposure"
                  description="Sourced protocol positions will appear here."
                />
              </div>
            )}
          </Card>
          <SectionHeader
            title="Provider status"
            description="Data availability across the protocol surface."
          />
          <Card className="divide-y divide-white/[0.08]">
            {data.providers.map((provider) => (
              <div className="flex items-center justify-between gap-3 p-4" key={provider.protocol}>
                <span>{labels[provider.protocol] ?? provider.protocol}</span>
                <StatusBadge tone={provider.status === 'available' ? 'positive' : 'warning'}>
                  {provider.status}
                </StatusBadge>
              </div>
            ))}
          </Card>
        </section>
      </div>
    </div>
  );
}
function PositionGroup({
  title,
  positions,
}: {
  title: string;
  positions: readonly DefiPosition[];
}) {
  return (
    <Card className="mb-3 p-4">
      <div className="flex items-center justify-between">
        <h3 className="font-medium capitalize">{title}</h3>
        <span className="text-xs text-[hsl(var(--muted))]">{positions.length}</span>
      </div>
      {positions.length ? (
        <div className="mt-3 space-y-2">
          {positions.map((position) => (
            <div
              className="flex items-center justify-between gap-3 rounded-md bg-white/[0.03] p-3 text-sm"
              key={position.id}
            >
              <div>
                <p>{labels[position.protocol] ?? position.protocol}</p>
                <p className="text-xs text-[hsl(var(--muted))]">
                  {position.marketId ?? 'Market unavailable'}
                </p>
              </div>
              <span className="tabular-nums">{position.value?.amount ?? '—'}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[hsl(var(--muted))]">No positions returned.</p>
      )}
    </Card>
  );
}
