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
import { templarApi, type TemplarPosition } from './templar-api';

function assetLabel(asset: unknown) {
  if (!asset || typeof asset !== 'object') return 'Asset identity unavailable';
  const value = asset as { assetCode?: string; contractAddress?: string; type?: string };
  return value.assetCode ?? value.contractAddress ?? (value.type === 'native' ? 'XLM' : 'Asset');
}
function tone(severity: string | undefined): 'low' | 'medium' | 'high' | 'critical' {
  return severity === 'critical' || severity === 'high' || severity === 'medium' ? severity : 'low';
}

export function TemplarPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const status = useQuery({
    queryKey: ['templar', 'status', network],
    queryFn: () => templarApi.status(network),
    staleTime: 60_000,
  });
  const enabled = status.data?.status === 'available';
  const positions = useQuery({
    queryKey: ['templar', 'positions', address, network],
    queryFn: () => templarApi.positions(address as string, network),
    enabled: enabled && Boolean(address),
    staleTime: 30_000,
  });
  const risk = useQuery({
    queryKey: ['templar', 'risk', address, network],
    queryFn: () => templarApi.risk(address as string, network),
    enabled: enabled && Boolean(address),
    staleTime: 30_000,
  });

  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to open Templar"
        description="Templar borrowing is account-specific. Financial OS never requests a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  if (status.error || positions.error || risk.error)
    return (
      <ErrorState
        title="Templar data unavailable"
        description="The configured Templar provider could not be reached."
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => void status.refetch()}
          >
            Retry
          </button>
        }
      />
    );
  if (status.isLoading)
    return (
      <div className="space-y-6">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  if (!enabled)
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="DeFi / Borrowing"
          title="Templar"
          description="Collateral, borrowing, health, and lifecycle state across Templar’s chain-abstraction markets."
          actions={<StatusBadge tone="warning">Provider unavailable</StatusBadge>}
        />
        <Card className="border-amber-300/20 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-medium uppercase tracking-[0.14em] text-amber-200">
                Risk monitor
              </p>
              <h2 className="mt-2 text-xl font-semibold">
                Borrowing risk is not currently observable
              </h2>
            </div>
            <RiskBadge level="high" />
          </div>
          <p className="mt-4 max-w-3xl text-sm leading-6 text-[hsl(var(--muted))]">
            {status.data?.reason ?? 'No verified Stellar-facing Templar provider is configured.'} No
            collateral, debt, LTV, health, rates, or actions are fabricated.
          </p>
        </Card>
        <Card className="p-5 text-sm text-[hsl(var(--muted))]">
          Templar’s documented market contracts and borrower operations are NEAR-based. A provider
          must supply verified Stellar-facing discovery, lifecycle status, simulation, and
          wallet-signable transaction preparation before this screen can show live data.
        </Card>
      </div>
    );

  const highestRisk = risk.data?.[0];
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="DeFi / Borrowing"
        title="Templar"
        description="Collateral, debt, health, rates, and lifecycle state."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="border-rose-300/25 bg-rose-950/20 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-rose-200">Borrowing risk</p>
            <p className="mt-2 text-3xl font-semibold">
              {highestRisk?.value ?? '—'} {highestRisk?.unit ?? ''}
            </p>
          </div>
          <RiskBadge level={tone(highestRisk?.severity)} />
        </div>
        <p className="mt-4 text-sm text-[hsl(var(--muted))]">
          Monitor health and liquidation proximity before increasing debt. Values are
          provider-sourced and may be stale.
        </p>
      </Card>
      <section className="space-y-3">
        <SectionHeader
          title="Risk metrics"
          description="LTV, liquidation threshold, health, and borrow rate."
        />
        {risk.data?.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {risk.data.map((item) => (
              <Metric
                key={item.name}
                label={item.name}
                value={`${item.value} ${item.unit}`}
                severity={item.severity}
              />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No risk metrics"
              description="The provider returned no risk metrics for this account."
            />
          </Card>
        )}
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Positions"
          description="Collateral, borrowed assets, health, and asynchronous lifecycle state."
        />
        {positions.data?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {positions.data.map((position) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No Templar positions"
              description="Collateralized and borrowed positions will appear here when returned by a verified provider."
            />
          </Card>
        )}
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Supported actions"
          description="Deposit collateral, withdraw collateral, borrow, and repay require provider-backed simulation before wallet signing."
        />
        <Card className="grid gap-3 p-5 sm:grid-cols-4">
          {['Deposit collateral', 'Withdraw collateral', 'Borrow', 'Repay'].map((action) => (
            <div className="rounded-lg border border-white/[0.08] p-4" key={action}>
              <p className="font-medium">{action}</p>
              <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                Provider availability required
              </p>
            </div>
          ))}
        </Card>
      </section>
    </div>
  );
}

function Metric({
  label,
  value,
  severity,
}: {
  label: string;
  value: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
}) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted))]">{label}</p>
        <RiskBadge level={severity} />
      </div>
      <p className="mt-3 text-xl font-semibold tabular-nums">{value}</p>
    </Card>
  );
}
function PositionCard({ position }: { position: TemplarPosition }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{position.marketId ?? 'Market unavailable'}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {position.positionStatus ?? 'Status unavailable'}
          </p>
        </div>
        <StatusBadge tone={position.lifecycleState === 'liquidatable' ? 'negative' : 'neutral'}>
          {position.lifecycleState.replaceAll('_', ' ')}
        </StatusBadge>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2 text-sm">
        <Info
          label="Collateral"
          value={
            position.collateral?.map((x) => `${assetLabel(x.asset)} ${x.amount}`).join(', ') ?? '—'
          }
        />
        <Info
          label="Borrowed"
          value={
            position.borrowed?.map((x) => `${assetLabel(x.asset)} ${x.amount}`).join(', ') ?? '—'
          }
        />
        <Info label="Collateral value" value={position.collateralValue?.amount ?? '—'} />
        <Info label="Borrowed value" value={position.borrowedValue?.amount ?? '—'} />
        <Info label="LTV" value={position.ltv ?? '—'} />
        <Info label="Liquidation threshold" value={position.liquidationThreshold ?? '—'} />
        <Info label="Health" value={position.health ?? '—'} />
        <Info label="Borrow rate" value={position.borrowRate ?? '—'} />
      </div>
    </Card>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 break-words tabular-nums">{value}</p>
    </div>
  );
}
