'use client';

import { useMemo } from 'react';
import {
  addition,
  Decimal,
  percentageChange,
  portfolioWeight,
  subtraction,
} from '@sfo/financial-math';
import {
  Button,
  Card,
  ChartContainer,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { useDashboardData } from './use-dashboard-data';
import type { Portfolio, PortfolioSnapshot } from './dashboard-api';

function money(value: string | null | undefined): string {
  if (value == null) return '—';
  const [whole = '0', fraction = ''] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${grouped}${fraction ? `.${fraction.slice(0, 2).padEnd(2, '0')}` : '.00'}`;
}

function relative(date: string | null | undefined): string {
  if (!date) return 'No sync recorded';
  const seconds = Math.max(0, Math.floor((Date.now() - Date.parse(date)) / 1000));
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

function DashboardLoading() {
  return (
    <div className="space-y-8" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} className="h-32" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    </div>
  );
}

function HistoryChart({ snapshots }: { snapshots: readonly PortfolioSnapshot[] }) {
  const points = useMemo(() => {
    const ordered = [...snapshots].reverse();
    if (ordered.length < 2) return '';
    const values = ordered.map((item) => new Decimal(item.totalValue));
    const first = values[0] ?? new Decimal(0);
    const min = values.reduce((lowest, value) => (value.lessThan(lowest) ? value : lowest), first);
    const max = values.reduce(
      (highest, value) => (value.greaterThan(highest) ? value : highest),
      first,
    );
    return values
      .map(
        (value, index) =>
          `${(index / (values.length - 1)) * 100},${
            96 -
            value
              .minus(min)
              .div(max.minus(min).isZero() ? 1 : max.minus(min))
              .times(82)
              .toNumber()
          }`,
      )
      .join(' ');
  }, [snapshots]);
  if (!points)
    return (
      <EmptyState
        title="History is still building"
        description="A chart will appear after the account has more than one portfolio snapshot."
      />
    );
  return (
    <div className="relative h-56">
      <svg
        role="img"
        aria-label="Portfolio value history"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="portfolio-line" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity=".35" />
            <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#portfolio-line)" />
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-[hsl(var(--muted))]">
        <span>{new Date(snapshots.at(-1)?.snapshotAt ?? '').toLocaleDateString()}</span>
        <span>{new Date(snapshots[0]?.snapshotAt ?? '').toLocaleDateString()}</span>
      </div>
    </div>
  );
}

function AllocationList({
  rows,
  label,
}: {
  rows: readonly { category?: string; protocol?: string; value: string }[];
  label: 'category' | 'protocol';
}) {
  if (!rows.length)
    return (
      <EmptyState
        title="No priced positions"
        description="Allocation will appear when synchronized assets have available quotes."
      />
    );
  const total = addition(...rows.map((row) => row.value));
  return (
    <div className="space-y-4">
      {rows.slice(0, 6).map((row) => {
        const name = row[label] ?? 'Other';
        const share = portfolioWeight(row.value, total);
        return (
          <div key={name}>
            <div className="mb-1 flex justify-between gap-3 text-sm">
              <span>{name}</span>
              <span className="tabular-nums text-[hsl(var(--muted))]">
                {money(row.value)} <span className="ml-1 text-xs">{share}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[hsl(var(--accent))]"
                style={{ width: `${Math.min(100, Number(share))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function LiveUnavailable({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} description={description} />
      <EmptyState
        title="Not available yet"
        description="This view will populate when its API integration is connected."
      />
    </Card>
  );
}

function DashboardContent() {
  const data = useDashboardData();
  const portfolio = data.query.data as Portfolio | undefined;
  const history = data.history.data ?? [];
  const change = useMemo(() => {
    if (!portfolio || history.length < 2) return null;
    const current = history[0]?.totalValue ?? portfolio.netPortfolioValue;
    const yesterday = history.find(
      (snapshot) => Date.now() - Date.parse(snapshot.snapshotAt) >= 86_400_000,
    )?.totalValue;
    if (!yesterday) return null;
    return {
      value: percentageChange(yesterday, current),
      absolute: subtraction(current, yesterday),
    };
  }, [history, portfolio]);
  const changeIsPositive = change ? !change.value.startsWith('-') && change.value !== '0' : false;
  const absoluteIsPositive = change
    ? !change.absolute.startsWith('-') && change.absolute !== '0'
    : false;
  const syncRunning = data.syncStatus.data?.streams.some((stream) =>
    ['queued', 'running'].includes(stream.status),
  );
  const lastSync =
    data.syncStatus.data?.streams
      .map((stream) => stream.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1) ?? portfolio?.asOf;

  if (!data.enabled)
    return (
      <EmptyState
        title="Connect a wallet to see your financial picture"
        description="Financial OS never asks for a secret key. Connect a supported wallet to load your portfolio, positions, and history."
        action={<ConnectWalletButton />}
      />
    );
  if (data.query.isLoading) return <DashboardLoading />;
  if (data.query.isError)
    return (
      <ErrorState
        title="Portfolio unavailable"
        description="We could not load this wallet's portfolio. Try again or refresh its synchronization."
        action={<Button onClick={() => void data.refresh()}>Retry</Button>}
      />
    );
  if (!portfolio)
    return (
      <EmptyState
        title="No portfolio data yet"
        description="Start an account synchronization to discover balances and positions."
        action={<Button onClick={() => data.sync.mutate()}>Sync account</Button>}
      />
    );
  const freshnessTone =
    portfolio.freshness === 'fresh'
      ? 'positive'
      : portfolio.freshness === 'unknown'
        ? 'neutral'
        : 'warning';
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Overview"
        title="Dashboard"
        description="Your financial situation across Stellar, protocols, and tokenized assets."
        actions={
          <>
            <StatusBadge tone={freshnessTone}>
              {portfolio.freshness === 'fresh' ? 'Live data' : `${portfolio.freshness} data`}
            </StatusBadge>
            <Button
              size="sm"
              variant="secondary"
              disabled={data.sync.isPending || syncRunning}
              onClick={() => data.sync.mutate()}
            >
              {data.sync.isPending || syncRunning ? 'Syncing…' : 'Refresh & sync'}
            </Button>
          </>
        }
      />
      {data.query.isFetching && !data.query.isLoading && (
        <p className="-mt-4 text-xs text-[hsl(var(--muted))]" role="status">
          Refreshing portfolio data…
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          label="Portfolio value"
          value={money(portfolio.netPortfolioValue)}
          change={`${portfolio.unpricedAssets.length ? `${portfolio.unpricedAssets.length} unpriced assets` : 'All discovered assets priced'}`}
          tone={portfolio.unpricedAssets.length ? 'warning' : 'positive'}
        />
        <MetricCard
          label="24h change"
          value={change ? `${changeIsPositive ? '+' : ''}${change.value}%` : '—'}
          change={
            change
              ? `${absoluteIsPositive ? '+' : ''}${money(change.absolute)}`
              : 'Needs 24h history'
          }
          tone={change && changeIsPositive ? 'positive' : 'neutral'}
        />
        <MetricCard
          label="Available liquidity"
          value={money(portfolio.availableLiquidity)}
          change="Wallet-held, priced assets"
          tone="accent"
        />
        <MetricCard
          label="Portfolio yield"
          value={portfolio.estimatedPortfolioYield ? `${portfolio.estimatedPortfolioYield}%` : '—'}
          change={
            portfolio.estimatedPortfolioYield
              ? `${money(portfolio.yieldBearingAssets)} yield-bearing`
              : 'No sourced APY available'
          }
          tone="positive"
        />
        <MetricCard
          label="Portfolio risk"
          value="—"
          change="Risk API not connected"
          tone="neutral"
        />
      </section>
      <section className="grid gap-6 lg:grid-cols-[1.35fr_.65fr]">
        <ChartContainer
          title="Portfolio history"
          legend={
            <span className="text-xs text-[hsl(var(--muted))]">90D · {portfolio.freshness}</span>
          }
        >
          {data.history.isLoading ? (
            <Skeleton className="h-56" />
          ) : data.history.isError ? (
            <ErrorState
              title="History unavailable"
              action={
                <Button size="sm" onClick={() => void data.history.refetch()}>
                  Retry
                </Button>
              }
            />
          ) : (
            <HistoryChart snapshots={history} />
          )}
        </ChartContainer>
        <Card className="p-5">
          <SectionHeader title="Account signal" description="The facts behind this view." />
          <div className="space-y-4 text-sm">
            <div className="flex justify-between gap-3">
              <span className="text-[hsl(var(--muted))]">Network</span>
              <span className="capitalize">{portfolio.network}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[hsl(var(--muted))]">Gross assets</span>
              <span className="tabular-nums">{money(portfolio.grossAssetValue)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[hsl(var(--muted))]">Liabilities</span>
              <span className="tabular-nums">{money(portfolio.liabilities)}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-[hsl(var(--muted))]">Last sync</span>
              <span className="text-[hsl(var(--muted))]">{relative(lastSync)}</span>
            </div>
          </div>
          {portfolio.unpricedAssets.length > 0 && (
            <p className="mt-6 rounded-lg border border-[hsl(var(--warning))]/20 bg-[hsl(var(--warning))]/[0.06] p-3 text-xs leading-5 text-[hsl(var(--muted))]">
              {portfolio.unpricedAssets.length} asset
              {portfolio.unpricedAssets.length === 1 ? '' : 's'} excluded from value until a trusted
              quote is available.
            </p>
          )}
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="Asset allocation"
            description="Where your capital is held by category."
          />
          <AllocationList rows={portfolio.byCategory} label="category" />
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Protocol allocation"
            description="Exposure across connected protocols."
          />
          <AllocationList rows={portfolio.byProtocol} label="protocol" />
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="RWA exposure"
            description="Tokenized real-world assets in your portfolio."
          />
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold tabular-nums">{money(portfolio.rwaExposure)}</p>
            <StatusBadge tone="info">Source-aware</StatusBadge>
          </div>
          <p className="mt-4 text-sm text-[hsl(var(--muted))]">
            Includes positions categorized as RWA or funds. Product terms remain unavailable unless
            sourced and verified.
          </p>
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="DeFi positions"
            description="Lending, liquidity, rewards, and protocol exposure."
          />
          <div className="flex items-end justify-between">
            <p className="text-3xl font-semibold tabular-nums">{money(portfolio.defiExposure)}</p>
            <StatusBadge tone="accent">Protocol value</StatusBadge>
          </div>
          <p className="mt-4 text-sm text-[hsl(var(--muted))]">
            Protocol positions are valued from synchronized position data and kept separate from
            wallet-held assets where custody metadata allows.
          </p>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <LiveUnavailable title="Recent activity" description="Payments and transactions" />
        <LiveUnavailable
          title="Cross-chain status"
          description="Transfers and destination status"
        />
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <LiveUnavailable
          title="Yield opportunities"
          description="Sourced opportunities from connected protocols"
        />
        <LiveUnavailable
          title="Capital flow"
          description="Deposits, withdrawals, and transfers over time"
        />
      </section>
      <section>
        <SectionHeader
          title="Quick actions"
          description="Wallet-signed actions will open from here as their flows become available."
        />
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {['Send payment', 'Swap assets', 'Deposit via anchor', 'Review risk'].map((label) => (
            <button
              key={label}
              disabled
              className="rounded-lg border border-white/[0.08] bg-[hsl(var(--surface-1))] p-4 text-left text-sm text-[hsl(var(--muted))] opacity-70"
            >
              <span className="mb-3 block text-lg text-[hsl(var(--accent))]">＋</span>
              {label}
              <span className="mt-1 block text-xs">Wallet action coming soon</span>
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

export function DashboardSections() {
  return <DashboardContent />;
}
