'use client';
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
import { useSession } from '../../lib/session/context';
import { institutionalApi, type InstitutionalOverview } from './institutional-api';
export function InstitutionalPage() {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ['institutional'],
    queryFn: institutionalApi.overview,
    enabled: Boolean(session),
    staleTime: 30_000,
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to open the institutional view"
        description="Multi-account reporting is available to authenticated workspaces."
        action={<ConnectWalletButton />}
      />
    );
  if (query.isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
        <Skeleton className="h-64" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <ErrorState
        title="Institutional view unavailable"
        description="The account aggregation could not be loaded."
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
    <div className="space-y-8 print:bg-white print:text-black">
      <PageHeader
        eyebrow="Institutional"
        title="One view for the capital you manage"
        description="Aggregate NAV, exposure, liquidity, yield, risk, and reporting across connected and view-only Stellar accounts."
        actions={
          <div className="flex gap-2">
            <button
              className="rounded-md border border-white/10 px-3 py-2 text-sm print:hidden"
              onClick={() => (globalThis as typeof globalThis & { print?: () => void }).print?.()}
            >
              Print report
            </button>
            <button
              className="rounded-md bg-[hsl(var(--accent))] px-3 py-2 text-sm font-medium text-black print:hidden"
              onClick={() => downloadCsv(data)}
            >
              Export CSV
            </button>
          </div>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Metric label="Portfolio NAV" value={data.nav.netPortfolioValue} />
        <Metric label="Gross assets" value={data.nav.grossAssetValue} />
        <Metric label="Liquidity" value={data.nav.availableLiquidity} />
        <Metric label="RWA exposure" value={data.exposure.rwa} />
        <Metric label="DeFi exposure" value={data.exposure.defi} />
      </div>
      <Card className="p-5">
        <SectionHeader
          title="Account coverage"
          description={`${data.signableAccountCount} connected/signable · ${data.viewOnlyAccountCount} view-only · as of ${new Date(data.asOf).toLocaleString()}`}
        />
        <div className="mt-5 overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-xs uppercase tracking-[0.1em] text-[hsl(var(--muted))]">
              <tr>
                <th className="pb-3">Account</th>
                <th className="pb-3">Access</th>
                <th className="pb-3">Group</th>
                <th className="pb-3">NAV</th>
                <th className="pb-3">Liquidity</th>
                <th className="pb-3">Freshness</th>
              </tr>
            </thead>
            <tbody>
              {data.accounts.map((account) => (
                <tr
                  className="border-t border-white/[0.08]"
                  key={`${account.network}-${account.address}`}
                >
                  <td className="py-3">
                    <p>{account.label ?? 'Unlabelled account'}</p>
                    <p className="mt-1 break-all font-mono text-xs text-[hsl(var(--muted))]">
                      {account.address}
                    </p>
                  </td>
                  <td className="py-3">
                    <StatusBadge
                      tone={account.access === 'CONNECTED_SIGNABLE_ACCOUNT' ? 'positive' : 'info'}
                    >
                      {account.access === 'CONNECTED_SIGNABLE_ACCOUNT'
                        ? 'Connected / signable'
                        : 'View-only'}
                    </StatusBadge>
                  </td>
                  <td className="py-3">{account.accountGroup ?? 'Ungrouped'}</td>
                  <td className="py-3">{account.portfolio?.netPortfolioValue ?? 'Unavailable'}</td>
                  <td className="py-3">{account.portfolio?.availableLiquidity ?? 'Unavailable'}</td>
                  <td className="py-3">{account.portfolio?.freshness ?? account.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      <div className="grid gap-5 lg:grid-cols-3">
        <Breakdown
          title="Account groups"
          rows={data.groups.map((row) => ({ label: row.name, value: row.netPortfolioValue }))}
        />
        <Breakdown
          title="Protocol exposure"
          rows={data.exposure.byProtocol.map((row) => ({
            label: String(row.protocol ?? 'unknown'),
            value: String(row.value),
          }))}
        />
        <Breakdown
          title="Issuer exposure"
          rows={data.exposure.byIssuer.map((row) => ({ label: row.issuer, value: row.value }))}
        />
      </div>
      <Card className="p-5">
        <SectionHeader title="Risk and yield" description={data.risk.methodology} />
        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <Metric
            label="Estimated portfolio yield"
            value={data.nav.estimatedPortfolioYield ?? 'Unavailable'}
          />
          <Metric label="Yield-bearing assets" value={data.nav.yieldBearingAssets} />
          <Metric label="Risk observations" value={String(data.risk.scores.length)} />
        </div>
      </Card>
      <Card className="p-5">
        <SectionHeader
          title="Transaction history"
          description="Normalized account history for reporting; statuses remain source-aware."
        />
        <div className="mt-4 max-h-72 overflow-auto">
          {data.transactionHistory.length ? (
            data.transactionHistory.map((item) => (
              <div
                className="flex flex-wrap justify-between gap-3 border-b border-white/[0.08] py-3 text-sm"
                key={`${item.accountId}-${item.hash}`}
              >
                <span className="break-all font-mono">{item.hash}</span>
                <span className="text-[hsl(var(--muted))]">
                  {item.status} ·{' '}
                  {item.ledgerTimestamp
                    ? new Date(item.ledgerTimestamp).toLocaleDateString()
                    : 'Time unavailable'}
                </span>
              </div>
            ))
          ) : (
            <EmptyState
              title="No transaction history"
              description="Synchronized account transactions will appear here."
            />
          )}
        </div>
      </Card>
    </div>
  );
}
function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-[0.1em] text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-2 text-xl font-medium">{value}</p>
    </div>
  );
}
function Breakdown({
  title,
  rows,
}: {
  title: string;
  rows: readonly { label: string; value: string }[];
}) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} />
      <div className="mt-4 space-y-3">
        {rows.length ? (
          rows.map((row) => (
            <div className="flex justify-between gap-3 text-sm" key={row.label}>
              <span className="break-all text-[hsl(var(--muted))]">{row.label}</span>
              <span>{row.value}</span>
            </div>
          ))
        ) : (
          <p className="text-sm text-[hsl(var(--muted))]">Unavailable until source data exists.</p>
        )}
      </div>
    </Card>
  );
}
function downloadCsv(data: InstitutionalOverview) {
  const rows = [
    [
      'address',
      'network',
      'access',
      'group',
      'nav',
      'liquidity',
      'rwa_exposure',
      'defi_exposure',
      'freshness',
    ],
    ...data.accounts.map((account) => [
      account.address,
      account.network,
      account.access,
      account.accountGroup ?? '',
      account.portfolio?.netPortfolioValue ?? '',
      account.portfolio?.availableLiquidity ?? '',
      account.portfolio?.rwaExposure ?? '',
      account.portfolio?.defiExposure ?? '',
      account.portfolio?.freshness ?? account.status,
    ]),
  ];
  const csv = rows
    .map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(','))
    .join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const browser = globalThis as typeof globalThis & {
    document?: {
      createElement: (tag: string) => { href: string; download: string; click: () => void };
    };
  };
  const anchor = browser.document?.createElement('a');
  if (!anchor) return;
  anchor.href = url;
  anchor.download = 'stellar-financial-os-institutional.csv';
  anchor.click();
  URL.revokeObjectURL(url);
}
