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
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { sushiApi, type SushiMarket, type SushiPosition } from './sushi-api';

function assetLabel(asset: unknown) {
  if (!asset || typeof asset !== 'object') return 'Asset identity unavailable';
  const value = asset as { assetCode?: string; contractAddress?: string; type?: string };
  return value.assetCode ?? value.contractAddress ?? (value.type === 'native' ? 'XLM' : 'Asset');
}

export function SushiPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const status = useQuery({
    queryKey: ['sushi', 'status', network],
    queryFn: () => sushiApi.status(network),
    staleTime: 60_000,
  });
  const enabled = status.data?.status === 'available';
  const markets = useQuery({
    queryKey: ['sushi', 'markets', network],
    queryFn: () => sushiApi.markets(network),
    enabled,
    staleTime: 30_000,
  });
  const positions = useQuery({
    queryKey: ['sushi', 'positions', address, network],
    queryFn: () => sushiApi.positions(address as string, network),
    enabled: enabled && Boolean(address),
    staleTime: 30_000,
  });
  const yields = useQuery({
    queryKey: ['sushi', 'yield', network],
    queryFn: () => sushiApi.yield(network),
    enabled,
    staleTime: 30_000,
  });
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to open Sushi"
        description="Sushi positions are account-specific. Financial OS never requests a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  if (status.error || markets.error || positions.error || yields.error)
    return (
      <ErrorState
        title="Sushi data unavailable"
        description="The configured Sushi provider could not be reached."
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => {
              void status.refetch();
              void markets.refetch();
              void positions.refetch();
              void yields.refetch();
            }}
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
        <Skeleton className="h-64" />
      </div>
    );
  if (!enabled)
    return (
      <div className="space-y-8">
        <PageHeader
          eyebrow="DeFi / Concentrated liquidity"
          title="Sushi"
          description="Sushi V3 is announced as live on Stellar Mainnet, but Financial OS has no verified Stellar contract/API provider configured yet."
          actions={<StatusBadge tone="warning">Provider unavailable</StatusBadge>}
        />
        <Card className="p-6">
          <EmptyState
            title="Integration boundary is ready"
            description={
              status.data?.reason ??
              'Pools, positions, ranges, fees, and actions will appear after a verified provider is configured. No Sushi endpoints or contract addresses are assumed.'
            }
          />
        </Card>
        <Card className="p-5">
          <p className="text-sm text-[hsl(var(--muted))]">
            The interface is intentionally unavailable until contract and indexer details are
            verified. This prevents ticker, pool, fee-tier, and position data from being presented
            as fact.
          </p>
        </Card>
      </div>
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="DeFi / Concentrated liquidity"
        title="Sushi"
        description="Concentrated liquidity pools, fee tiers, ranges, positions, and accrued fees."
        actions={<StatusBadge tone="positive">Provider available</StatusBadge>}
      />
      <section className="space-y-3">
        <SectionHeader
          title="Pools"
          description="Verified Sushi V3 pool metadata from the configured provider."
        />
        {markets.data?.length ? (
          <div className="grid gap-4 lg:grid-cols-2">
            {markets.data.map((market) => (
              <MarketCard key={market.id} market={market} />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No pools returned"
              description="The provider returned no Sushi pools for this network."
            />
          </Card>
        )}
      </section>
      <section className="space-y-3">
        <SectionHeader
          title="Your positions"
          description="Range, in/out-of-range state, value, accrued fees, and APR where sourced."
        />
        {positions.data?.length ? (
          <div className="grid gap-4 md:grid-cols-2">
            {positions.data.map((position) => (
              <PositionCard key={position.id} position={position} />
            ))}
          </div>
        ) : (
          <Card className="p-6">
            <EmptyState
              title="No concentrated-liquidity positions"
              description="No Sushi positions were returned for the connected wallet."
            />
          </Card>
        )}
      </section>
    </div>
  );
}

function MarketCard({ market }: { market: SushiMarket }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{market.name}</p>
          <p className="mt-1 break-all text-xs text-[hsl(var(--muted))]">{market.id}</p>
        </div>
        <StatusBadge tone={market.enabled ? 'positive' : 'warning'}>
          {market.enabled ? 'Active' : 'Unavailable'}
        </StatusBadge>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[hsl(var(--muted))]">Fee tier</p>
          <p className="mt-1 tabular-nums">{market.feeTier ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--muted))]">Model</p>
          <p className="mt-1">{market.concentrated ? 'Concentrated' : '—'}</p>
        </div>
      </div>
    </Card>
  );
}
function PositionCard({ position }: { position: SushiPosition }) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium">LP position</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {position.marketId ?? 'Pool unavailable'}
          </p>
        </div>
        <StatusBadge
          tone={
            position.inRange === false
              ? 'warning'
              : position.inRange === true
                ? 'positive'
                : 'neutral'
          }
        >
          {position.inRange == null
            ? 'Range unknown'
            : position.inRange
              ? 'In range'
              : 'Out of range'}
        </StatusBadge>
      </div>
      <div className="mt-5 space-y-2 text-sm">
        {position.assets.map((item, index) => (
          <div className="flex justify-between" key={`${assetLabel(item.asset)}-${index}`}>
            <span>{assetLabel(item.asset)}</span>
            <span className="tabular-nums">{item.amount}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-xs text-[hsl(var(--muted))]">Price range</p>
          <p className="mt-1">
            {position.priceRange
              ? `${position.priceRange.lower ?? '—'} – ${position.priceRange.upper ?? '—'}`
              : '—'}
          </p>
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--muted))]">APR</p>
          <p className="mt-1 tabular-nums">{position.apr ?? '—'}</p>
        </div>
      </div>
      {position.fees?.length ? (
        <p className="mt-4 text-xs text-[hsl(var(--muted))]">
          Accrued fees:{' '}
          {position.fees.map((fee) => `${assetLabel(fee.asset)} ${fee.amount}`).join(', ')}
        </p>
      ) : null}
    </Card>
  );
}
