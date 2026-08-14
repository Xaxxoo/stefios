'use client';

import { useState } from 'react';
import type { ChangeEvent } from 'react';
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
import { clientEnv } from '../../lib/config/env';
import { useWallet } from '../../lib/wallet/context';
import { yieldApi, type YieldOpportunity } from './yield-api';

export function YieldPage() {
  const { network: walletNetwork } = useWallet();
  const network = walletNetwork ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const [filters, setFilters] = useState<Record<string, string>>({});
  const query = useQuery({
    queryKey: ['yield', network, filters],
    queryFn: () => yieldApi.opportunities(network, filters),
    staleTime: 60_000,
  });
  const setFilter = (key: string, value: string) =>
    setFilters((current) => {
      const next = { ...current };
      if (value === 'all') delete next[key];
      else next[key] = value;
      return next;
    });
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Returns intelligence"
        title="Yield"
        description="Source-aware opportunities across Stellar DeFi. Estimated APY is an estimate, never a guarantee."
        actions={
          <StatusBadge tone={query.isFetching ? 'warning' : 'info'}>
            {query.isFetching ? 'Refreshing' : network}
          </StatusBadge>
        }
      />
      <Card className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <Filter
          label="Protocol"
          value={filters.protocol ?? 'all'}
          options={['all', 'blend', 'aquarius', 'sushi', 'templar']}
          onChange={(value) => setFilter('protocol', value)}
        />
        <Filter
          label="Asset scope"
          value={filters.rwaOrDefi ?? 'all'}
          options={['all', 'defi', 'rwa']}
          onChange={(value) => setFilter('rwaOrDefi', value)}
        />
        <Filter
          label="Risk"
          value={filters.risk ?? 'all'}
          options={['all', 'low', 'medium', 'high', 'unknown']}
          onChange={(value) => setFilter('risk', value)}
        />
        <Filter
          label="Liquidity"
          value={filters.liquidity ?? 'all'}
          options={['all', 'TVL', 'unavailable']}
          onChange={(value) => setFilter('liquidity', value)}
        />
        <Filter
          label="Yield"
          value={filters.yield ?? 'highest'}
          options={['highest', 'lowest']}
          onChange={(value) => setFilter('yield', value)}
        />
      </Card>
      <section className="space-y-3">
        <SectionHeader
          title="Opportunities"
          description="Base yield, reward yield, methodology, freshness, and liquidity context are shown separately."
        />
        {query.isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            <Skeleton className="h-64" />
            <Skeleton className="h-64" />
          </div>
        ) : query.error ? (
          <ErrorState
            title="Yield data unavailable"
            description="No yield provider response could be loaded."
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
          <div className="grid gap-4 md:grid-cols-2">
            {query.data.map((item) => (
              <Opportunity key={`${item.protocol}-${item.market}`} item={item} />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No sourced opportunities"
              description="No providers returned opportunities matching these filters."
            />
          </Card>
        )}
      </section>
    </div>
  );
}
function Filter({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: readonly string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-[hsl(var(--muted))]">
      {label}
      <select
        className="mt-2 block w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
        value={value}
        onChange={(event: ChangeEvent<HTMLSelectElement>) =>
          onChange((event.currentTarget as unknown as { value: string }).value)
        }
      >
        {options.map((option) => (
          <option className="bg-slate-900" key={option} value={option}>
            {option === 'all' ? 'All' : option}
          </option>
        ))}
      </select>
    </label>
  );
}
function Opportunity({ item }: { item: YieldOpportunity }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted))]">
            {item.protocol}
          </p>
          <h3 className="mt-1 text-lg font-medium">{item.market}</h3>
        </div>
        <StatusBadge
          tone={
            item.riskCategory === 'high'
              ? 'negative'
              : item.riskCategory === 'unknown'
                ? 'warning'
                : 'neutral'
          }
        >
          {item.riskCategory} risk
        </StatusBadge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Stat label="Base yield" value={item.baseYield ?? '—'} />
        <Stat label="Reward yield" value={item.rewardYield ?? '—'} />
        <Stat label="Estimated total" value={item.totalEstimatedYield ?? '—'} />
      </div>
      <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted))]">{item.methodology}</p>
      <p className="mt-3 text-xs text-[hsl(var(--muted))]">
        {item.liquidityConsiderations ?? 'Liquidity considerations unavailable.'}
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <StatusBadge tone={item.stale ? 'warning' : 'positive'}>
          {item.stale ? 'Stale estimate' : 'Fresh estimate'}
        </StatusBadge>
        <StatusBadge tone="neutral">{item.source}</StatusBadge>
      </div>
    </Card>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
