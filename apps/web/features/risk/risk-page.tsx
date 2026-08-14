'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
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
import { riskApi, type RiskHeatmapRow, type RiskSignal } from './risk-api';

const columns = [
  'concentration',
  'liquidity',
  'market',
  'issuer',
  'protocol',
  'liquidation',
  'dataQuality',
];
const label: Record<string, string> = {
  assetConcentration: 'Asset concentration',
  issuerConcentration: 'Issuer concentration',
  protocolConcentration: 'Protocol concentration',
  rwaManagerExposure: 'RWA manager exposure',
  stablecoinExposure: 'Stablecoin exposure',
  unpricedExposure: 'Unpriced exposure',
  stalePricing: 'Stale pricing',
  defiHealth: 'DeFi health',
  liquidationProximity: 'Liquidation proximity',
  borrowUtilization: 'Borrow utilization',
  smartContractExposure: 'Smart-contract exposure',
  crossChainPendingExposure: 'Cross-chain pending exposure',
};
function riskLevel(value: RiskSignal['severity']): 'low' | 'medium' | 'high' | 'critical' {
  return value === 'medium' || value === 'high' || value === 'critical' ? value : 'low';
}
function cellClass(value: string) {
  return value === 'critical'
    ? 'bg-rose-500/40 text-rose-100'
    : value === 'high'
      ? 'bg-orange-400/30 text-orange-100'
      : value === 'medium'
        ? 'bg-amber-300/25 text-amber-100'
        : value === 'low'
          ? 'bg-emerald-400/20 text-emerald-100'
          : 'bg-white/[0.06] text-[hsl(var(--muted))]';
}

export function RiskPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const query = useQuery({
    queryKey: ['risk', address, network],
    queryFn: () => riskApi.get(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to view risk"
        description="Risk analysis is account-specific. Financial OS does not provide financial advice or handle private keys."
        action={<ConnectWalletButton />}
      />
    );
  if (query.isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-28" />
        <Skeleton className="h-80" />
        <Skeleton className="h-96" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <ErrorState
        title="Risk data unavailable"
        description="The portfolio risk analysis could not be loaded."
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
        eyebrow="Portfolio intelligence"
        title="Risk"
        description="Inspectable exposure, liquidity, leverage, data-quality, and protocol health signals."
        actions={
          <StatusBadge tone={query.isFetching ? 'warning' : 'info'}>
            {query.isFetching ? 'Refreshing' : network}
          </StatusBadge>
        }
      />
      <Card className="border-rose-300/20 bg-rose-950/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-rose-200">Overall risk score</p>
            <p className="mt-2 text-4xl font-semibold tabular-nums">
              {data.overallScore ?? '—'}
              <span className="ml-2 text-base font-normal text-[hsl(var(--muted))]">/ 100</span>
            </p>
          </div>
          <RiskBadge level={riskLevel(data.severity)} />
        </div>
        <p className="mt-4 max-w-3xl text-sm leading-6 text-[hsl(var(--muted))]">
          {data.explanation}
        </p>
        <p className="mt-3 text-xs text-[hsl(var(--muted))]">
          This is an analytical risk model, not financial advice.
        </p>
      </Card>
      <section className="space-y-3">
        <SectionHeader
          title="Risk categories"
          description="Each signal includes its score, explanation, and a possible mitigation. Unknown inputs are shown as unknown."
        />
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.signals.map((item) => (
            <SignalCard key={item.category} item={item} />
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Portfolio risk heatmap"
          description="Rows are priced assets. Unknown cells mean the current data does not support a conclusion."
        />
        <Heatmap rows={data.heatmap} />
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Methodology"
          description="The model is inspectable and separates available evidence from unavailable inputs."
        />
        <Card className="divide-y divide-white/[0.08]">
          {data.methodology.map((item) => (
            <details className="group p-4" key={item.category}>
              <summary className="cursor-pointer list-none font-medium">
                {label[item.category] ?? item.category}
                <span className="float-right text-[hsl(var(--muted))]">+</span>
              </summary>
              <div className="mt-3 space-y-2 text-sm text-[hsl(var(--muted))]">
                <p>
                  <span className="text-white">Formula:</span> {item.formula}
                </p>
                <p>
                  <span className="text-white">Interpretation:</span> {item.interpretation}
                </p>
              </div>
            </details>
          ))}
        </Card>
        <Card className="p-5 text-sm text-[hsl(var(--muted))]">
          <p>{data.possibleMitigation}</p>
          <p className="mt-2">
            Risk scores are informational and do not constitute financial advice.
          </p>
        </Card>
      </section>
    </div>
  );
}
function SignalCard({ item }: { item: RiskSignal }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{label[item.category] ?? item.category}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {item.known ? 'Calculated from available inputs' : 'Input unavailable'}
          </p>
        </div>
        <RiskBadge level={riskLevel(item.severity)} />
      </div>
      <p className="mt-4 text-2xl font-semibold tabular-nums">{item.score ?? '—'}</p>
      <p className="mt-3 text-sm leading-6 text-[hsl(var(--muted))]">{item.explanation}</p>
      <p className="mt-3 text-xs text-[hsl(var(--muted))]">
        Possible mitigation: {item.possibleMitigation}
      </p>
    </Card>
  );
}
function Heatmap({ rows }: { rows: readonly RiskHeatmapRow[] }) {
  if (!rows.length)
    return (
      <Card className="p-6">
        <EmptyState
          title="Heatmap unavailable"
          description="Priced exposure rows are required to build the heatmap."
        />
      </Card>
    );
  return (
    <Card className="overflow-x-auto">
      <table className="min-w-[760px] w-full text-left text-sm">
        <thead>
          <tr className="border-b border-white/[0.08] text-xs uppercase tracking-[0.1em] text-[hsl(var(--muted))]">
            <th className="p-4">Exposure</th>
            {columns.map((column) => (
              <th className="p-4" key={column}>
                {column === 'dataQuality' ? 'Data quality' : column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              className="border-b border-white/[0.06] last:border-0"
              key={`${row.kind}-${row.label}`}
            >
              <td className="max-w-56 truncate p-4">
                <span className="mr-2 text-xs text-[hsl(var(--muted))]">{row.kind}</span>
                {row.label}
              </td>
              {columns.map((column) => (
                <td
                  className={`p-4 text-xs font-medium capitalize ${cellClass(row.cells[column] ?? 'unknown')}`}
                  key={column}
                >
                  {row.cells[column] ?? 'unknown'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
