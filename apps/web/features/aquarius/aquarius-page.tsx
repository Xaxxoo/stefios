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
import { aquariusApi, type AquariusMarket, type AquariusPosition } from './aquarius-api';

function assetLabel(asset: unknown) {
  if (!asset || typeof asset !== 'object') return 'Asset identity unavailable';
  const value = asset as { contractAddress?: string; assetCode?: string; type?: string };
  return value.assetCode ?? value.contractAddress ?? (value.type === 'native' ? 'XLM' : 'Asset');
}

export function AquariusPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const markets = useQuery({
    queryKey: ['aquarius', 'markets', network],
    queryFn: () => aquariusApi.markets(network),
    staleTime: 30_000,
  });
  const positions = useQuery({
    queryKey: ['aquarius', 'positions', address, network],
    queryFn: () => aquariusApi.positions(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  const yields = useQuery({
    queryKey: ['aquarius', 'yield', network],
    queryFn: () => aquariusApi.yield(network),
    staleTime: 30_000,
  });
  const error = markets.error ?? positions.error ?? yields.error;
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to open Aquarius"
        description="Aquarius liquidity and swap preparation are account-specific. Financial OS never requests a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  if (error)
    return (
      <ErrorState
        title="Aquarius data unavailable"
        description={
          error instanceof Error
            ? error.message
            : 'The configured Aquarius providers could not be reached.'
        }
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => {
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
  const loading = markets.isLoading || positions.isLoading || yields.isLoading;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="DeFi / Liquidity"
        title="Aquarius"
        description="Current pool discovery, liquidity exposure, fees, rewards, and fresh route preparation for swaps."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <section className="space-y-3">
            <SectionHeader
              title="Pools"
              description="Pool metadata is read from the Aquarius AMM API. Reserves and rates remain blank when the provider does not return them."
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
                  title="No Aquarius pools available"
                  description="The configured Aquarius provider returned no pools for this network."
                />
              </Card>
            )}
          </section>
          <section className="space-y-3">
            <SectionHeader
              title="Your liquidity"
              description="LP shares, underlying assets, and claimable rewards when indexed."
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
                  title="No liquidity positions"
                  description="Aquarius positions will appear after the account is indexed."
                />
              </Card>
            )}
          </section>
          <section className="space-y-3">
            <SectionHeader
              title="Swap & routing"
              description="Aquarius supports optimal path routing, including multi-hop routes where available. Quotes are fetched again during transaction preparation and never reused as final execution data."
            />
            <Card className="p-5">
              <div className="grid gap-4 sm:grid-cols-3">
                <Metric title="Fresh quote source" value="Aquarius AMM API" />
                <Metric title="Route limit" value="Up to 4 pools" />
                <Metric title="Price impact" value="Provider-dependent" />
              </div>
              <p className="mt-5 text-sm text-[hsl(var(--muted))]">
                Use the unified swap flow to request a quote. The API exposes Aquarius as a quote
                source and rebuilds the route immediately before Stellar RPC simulation.
              </p>
            </Card>
          </section>
          <section className="space-y-3">
            <SectionHeader
              title="Yield signals"
              description="Only provider-supplied APR/APY estimates are shown."
            />
            <Card className="overflow-hidden">
              <div className="divide-y divide-white/[0.06]">
                {yields.data?.length ? (
                  yields.data.map((item) => (
                    <div
                      key={item.market}
                      className="flex items-center justify-between px-5 py-4 text-sm"
                    >
                      <span>{item.market}</span>
                      <span className="tabular-nums">{item.apy}</span>
                    </div>
                  ))
                ) : (
                  <div className="p-6">
                    <EmptyState
                      title="No yield estimates available"
                      description="Aquarius did not return an APR/APY estimate for the configured pools."
                    />
                  </div>
                )}
              </div>
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.02] p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">{title}</p>
      <p className="mt-2 font-medium">{value}</p>
    </div>
  );
}
function MarketCard({ market }: { market: AquariusMarket }) {
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
          <p className="text-xs text-[hsl(var(--muted))]">Pool type</p>
          <p className="mt-1">{market.poolType ?? '—'}</p>
        </div>
        <div>
          <p className="text-xs text-[hsl(var(--muted))]">Fee</p>
          <p className="mt-1 tabular-nums">{market.fee ?? '—'}</p>
        </div>
      </div>
    </Card>
  );
}
function PositionCard({ position }: { position: AquariusPosition }) {
  return (
    <Card className="p-5">
      <p className="font-medium">Liquidity position</p>
      <p className="mt-1 text-xs text-[hsl(var(--muted))]">
        {position.marketId ?? 'Pool unavailable'}
      </p>
      <div className="mt-4 space-y-2">
        {position.assets.map((item, index) => (
          <div key={`${assetLabel(item.asset)}-${index}`} className="flex justify-between text-sm">
            <span>{assetLabel(item.asset)}</span>
            <span className="tabular-nums">{item.amount}</span>
          </div>
        ))}
      </div>
      {position.rewards?.length ? (
        <p className="mt-4 text-xs text-[hsl(var(--muted))]">
          Claimable rewards: {position.rewards.map((reward) => reward.amount).join(', ')}
        </p>
      ) : null}
    </Card>
  );
}
