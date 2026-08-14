'use client';

import { useMemo, useState } from 'react';
import { addition, Decimal, portfolioWeight } from '@sfo/financial-math';
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
import { useDashboardData } from '../dashboard/use-dashboard-data';
import type { Portfolio, PortfolioAllocation, PortfolioSnapshot } from '../dashboard/dashboard-api';

const filters = ['All', 'Cash', 'Stablecoins', 'RWAs', 'DeFi', 'Other'] as const;
type Filter = (typeof filters)[number];

function money(value: string | null | undefined): string {
  if (value == null) return '—';
  const [whole = '0', fraction = ''] = value.split('.');
  const grouped = whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `$${grouped}${fraction ? `.${fraction.slice(0, 2).padEnd(2, '0')}` : '.00'}`;
}

function isInFilter(row: PortfolioAllocation, filter: Filter) {
  if (filter === 'All') return true;
  const category = row.category.toLowerCase();
  if (filter === 'Cash') return ['native', 'cash'].includes(category);
  if (filter === 'Stablecoins') return ['stablecoin', 'stablecoins'].includes(category);
  if (filter === 'RWAs') return ['rwa', 'fund'].includes(category);
  if (filter === 'DeFi') return Boolean(row.protocol) || category === 'defi';
  return (
    !['native', 'cash', 'stablecoin', 'stablecoins', 'rwa', 'fund', 'defi'].includes(category) &&
    !row.protocol
  );
}

function PerformanceChart({ snapshots }: { snapshots: readonly PortfolioSnapshot[] }) {
  const points = useMemo(() => {
    const ordered = [...snapshots].reverse();
    if (ordered.length < 2) return '';
    const values = ordered.map((item) => new Decimal(item.totalValue));
    const first = values[0] ?? new Decimal(0);
    const min = values.reduce(
      (value, current) => (current.lessThan(value) ? current : value),
      first,
    );
    const max = values.reduce(
      (value, current) => (current.greaterThan(value) ? current : value),
      first,
    );
    const range = max.minus(min);
    return values
      .map(
        (value, index) =>
          `${(index / (values.length - 1)) * 100},${
            94 -
            value
              .minus(min)
              .div(range.isZero() ? 1 : range)
              .times(82)
              .toNumber()
          }`,
      )
      .join(' ');
  }, [snapshots]);
  if (!points)
    return (
      <EmptyState
        title="Performance history is building"
        description="Return after more portfolio snapshots have been collected."
      />
    );
  return (
    <div className="relative h-64">
      <svg
        role="img"
        aria-label="Historical portfolio performance"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        className="h-full w-full"
      >
        <defs>
          <linearGradient id="portfolio-performance" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="hsl(var(--accent))" stopOpacity=".32" />
            <stop offset="1" stopColor="hsl(var(--accent))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polygon points={`0,100 ${points} 100,100`} fill="url(#portfolio-performance)" />
        <polyline
          points={points}
          fill="none"
          stroke="hsl(var(--accent))"
          strokeWidth="1.5"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      <div className="absolute inset-x-0 bottom-0 flex justify-between text-[10px] text-[hsl(var(--muted))]">
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
  rows: readonly {
    asset?: string;
    symbol?: string | null;
    category?: string;
    protocol?: string | null;
    value: string | null;
  }[];
  label: 'asset' | 'category' | 'protocol';
}) {
  const pricedRows = rows.filter(
    (row): row is typeof row & { value: string } => row.value !== null,
  );
  if (!pricedRows.length)
    return (
      <EmptyState
        title="No allocation data"
        description="Allocation appears when synchronized assets have trusted valuations."
      />
    );
  const total = addition(...pricedRows.map((row) => row.value));
  return (
    <div className="space-y-4">
      {pricedRows.slice(0, 7).map((row) => {
        const name =
          label === 'asset'
            ? (row.symbol ?? row.asset ?? 'Unknown asset')
            : (row[label] ?? 'Other');
        const weight = portfolioWeight(row.value, total);
        return (
          <div key={name}>
            <div className="mb-1 flex justify-between text-sm">
              <span>{name}</span>
              <span className="tabular-nums text-[hsl(var(--muted))]">
                {money(row.value)} <span className="ml-1 text-xs">{weight}%</span>
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
              <div
                className="h-full rounded-full bg-[hsl(var(--accent))]"
                style={{ width: `${Math.min(100, Number(weight))}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

function downloadCsv(rows: readonly PortfolioAllocation[], total: string) {
  const header = [
    'asset',
    'balance',
    'price',
    'value',
    'portfolio weight',
    '24h change',
    'yield',
    'location/protocol',
  ];
  const lines = rows.map((row) =>
    [
      row.symbol ?? row.asset,
      row.quantity,
      row.price ?? '',
      row.value ?? '',
      row.value ? portfolioWeight(row.value, total) : '',
      '',
      row.apy ?? '',
      row.protocol ?? (row.category || 'Wallet'),
    ]
      .map((value) => `"${String(value).replaceAll('"', '""')}"`)
      .join(','),
  );
  const csv = [header.join(','), ...lines].join('\n');
  const browser = globalThis as typeof globalThis & {
    document: {
      createElement(tag: string): { href: string; download: string; click(): void };
      body: { appendChild(node: unknown): void; removeChild(node: unknown): void };
    };
    URL: { createObjectURL(blob: Blob): string; revokeObjectURL(url: string): void };
  };
  const url = browser.URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
  const link = browser.document.createElement('a');
  link.href = url;
  link.download = 'stellar-financial-os-portfolio.csv';
  browser.document.body.appendChild(link);
  link.click();
  browser.document.body.removeChild(link);
  browser.URL.revokeObjectURL(url);
}

function PortfolioLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Skeleton className="h-32" key={index} />
        ))}
      </div>
      <Skeleton className="h-80" />
      <Skeleton className="h-96" />
    </div>
  );
}

export function PortfolioPage() {
  const data = useDashboardData();
  const [filter, setFilter] = useState<Filter>('All');
  const portfolio = data.query.data as Portfolio | undefined;
  const history = data.history.data ?? [];
  if (!data.enabled)
    return (
      <EmptyState
        title="Connect a wallet to view your portfolio"
        description="Financial OS reads your wallet through a signed connection and never requests a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  if (data.query.isLoading) return <PortfolioLoading />;
  if (data.query.isError)
    return (
      <ErrorState
        title="Portfolio unavailable"
        description="The portfolio API could not load this account."
        action={<Button onClick={() => void data.refresh()}>Retry</Button>}
      />
    );
  if (!portfolio)
    return (
      <EmptyState
        title="No portfolio data yet"
        description="Synchronize the connected account to discover holdings."
        action={<Button onClick={() => data.sync.mutate()}>Sync account</Button>}
      />
    );
  const rows = portfolio.byAsset.filter((row) => isInFilter(row, filter));
  const pricedRows = rows.filter((row) => row.value !== null);
  const filteredTotal = addition(...pricedRows.map((row) => row.value as string));
  const syncRunning =
    data.sync.isPending ||
    data.syncStatus.data?.streams.some((stream) => ['queued', 'running'].includes(stream.status));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Command center / Holdings"
        title="Portfolio"
        description="Understand what you own, where it is, and how it contributes to the whole."
        actions={
          <>
            <StatusBadge tone={portfolio.freshness === 'fresh' ? 'positive' : 'warning'}>
              {portfolio.freshness} data
            </StatusBadge>
            <Button
              size="sm"
              variant="secondary"
              disabled={syncRunning}
              onClick={() => data.sync.mutate()}
            >
              {syncRunning ? 'Syncing…' : 'Refresh & sync'}
            </Button>
            <Button
              size="sm"
              variant="primary"
              disabled={!pricedRows.length}
              onClick={() => downloadCsv(pricedRows, filteredTotal)}
            >
              Export CSV
            </Button>
          </>
        }
      />
      {data.query.isFetching && !data.query.isLoading && (
        <p className="-mt-4 text-xs text-[hsl(var(--muted))]" role="status">
          Refreshing portfolio…
        </p>
      )}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="Portfolio value"
          value={money(portfolio.netPortfolioValue)}
          change={
            portfolio.unpricedAssets.length
              ? `${portfolio.unpricedAssets.length} unpriced`
              : 'Trusted valuations available'
          }
          tone={portfolio.unpricedAssets.length ? 'warning' : 'positive'}
        />
        <MetricCard
          label="Historical performance"
          value={history.length > 1 ? `${history.length} snapshots` : '—'}
          change={history.length > 1 ? 'Performance history' : 'Needs more history'}
          tone="accent"
        />
        <MetricCard
          label="Available liquidity"
          value={money(portfolio.availableLiquidity)}
          change="Wallet-held priced assets"
          tone="positive"
        />
        <MetricCard
          label="Yield-bearing assets"
          value={money(portfolio.yieldBearingAssets)}
          change={
            portfolio.estimatedPortfolioYield
              ? `${portfolio.estimatedPortfolioYield}% estimated APY`
              : 'No sourced APY'
          }
          tone="positive"
        />
      </section>
      <ChartContainer
        title="Historical performance"
        legend={<span className="text-xs text-[hsl(var(--muted))]">90D · {portfolio.network}</span>}
      >
        {data.history.isLoading ? (
          <Skeleton className="h-64" />
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
          <PerformanceChart snapshots={history} />
        )}
      </ChartContainer>
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <SectionHeader title="Asset allocation" description="Exposure by canonical asset." />
          <AllocationList rows={portfolio.byAsset} label="asset" />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Category allocation" description="Exposure grouped by category." />
          <AllocationList rows={portfolio.byCategory} label="category" />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Protocol allocation" description="Value held across protocols." />
          <AllocationList rows={portfolio.byProtocol} label="protocol" />
        </Card>
      </section>
      <section>
        <Card className="overflow-hidden">
          <div className="border-b border-white/[0.08] p-5">
            <SectionHeader
              title="Holdings"
              description="Balances and trusted valuations. Cost basis and realized P&L are omitted because reliable data is not available yet."
            />
          </div>
          <div className="flex gap-2 overflow-x-auto border-b border-white/[0.08] px-5 py-3">
            {filters.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs transition-colors ${filter === item ? 'border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' : 'border-white/[0.08] text-[hsl(var(--muted))] hover:bg-white/[0.05]'}`}
              >
                {item}
              </button>
            ))}
          </div>
          {!rows.length ? (
            <div className="p-5">
              <EmptyState
                title="No holdings in this filter"
                description="Try another category or synchronize the account."
              />
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full min-w-[900px] text-left text-sm">
                  <thead className="border-b border-white/[0.08] text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))]">
                    <tr>
                      {[
                        'Asset',
                        'Balance',
                        'Price',
                        'Value',
                        'Weight',
                        '24h change',
                        'Yield',
                        'Location / protocol',
                      ].map((heading) => (
                        <th className="px-5 py-3 font-medium" key={heading}>
                          {heading}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((row) => (
                      <tr className="border-b border-white/[0.06] last:border-0" key={row.asset}>
                        <td className="px-5 py-4 font-medium">{row.symbol ?? row.asset}</td>
                        <td className="px-5 py-4 tabular-nums">{row.quantity}</td>
                        <td className="px-5 py-4 tabular-nums">
                          {row.price ? money(row.price) : '—'}
                        </td>
                        <td className="px-5 py-4 tabular-nums">{money(row.value)}</td>
                        <td className="px-5 py-4 tabular-nums">
                          {row.value ? `${portfolioWeight(row.value, filteredTotal)}%` : '—'}
                        </td>
                        <td className="px-5 py-4 text-[hsl(var(--muted))]">—</td>
                        <td className="px-5 py-4 tabular-nums">{row.apy ? `${row.apy}%` : '—'}</td>
                        <td className="px-5 py-4 text-[hsl(var(--muted))]">
                          {row.protocol ?? (row.category || 'Wallet')}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="divide-y divide-white/[0.06] md:hidden">
                {rows.map((row) => (
                  <article className="space-y-3 p-4" key={row.asset}>
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{row.symbol ?? row.asset}</span>
                      <span className="tabular-nums">{money(row.value)}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <span className="text-[hsl(var(--muted))]">
                        Balance{' '}
                        <strong className="ml-1 font-normal text-foreground">{row.quantity}</strong>
                      </span>
                      <span className="text-[hsl(var(--muted))]">
                        Weight{' '}
                        <strong className="ml-1 font-normal text-foreground">
                          {row.value ? `${portfolioWeight(row.value, filteredTotal)}%` : '—'}
                        </strong>
                      </span>
                      <span className="text-[hsl(var(--muted))]">
                        Price{' '}
                        <strong className="ml-1 font-normal text-foreground">
                          {row.price ? money(row.price) : '—'}
                        </strong>
                      </span>
                      <span className="text-[hsl(var(--muted))]">
                        Yield{' '}
                        <strong className="ml-1 font-normal text-foreground">
                          {row.apy ? `${row.apy}%` : '—'}
                        </strong>
                      </span>
                    </div>
                    <p className="text-xs text-[hsl(var(--muted))]">
                      Location · {row.protocol ?? (row.category || 'Wallet')}
                    </p>
                  </article>
                ))}
              </div>
            </>
          )}
        </Card>
      </section>
    </div>
  );
}
