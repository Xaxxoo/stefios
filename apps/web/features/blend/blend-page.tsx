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
import { useWallet } from '../../lib/wallet/context';
import { clientEnv } from '../../lib/config/env';
import { blendApi, type BlendMarket, type BlendPosition } from './blend-api';

function format(value: string | null | undefined) {
  return value == null ? '—' : value;
}
function assetLabel(asset: unknown) {
  if (!asset || typeof asset !== 'object') return 'Asset identity unavailable';
  const value = asset as { assetCode?: string; contractAddress?: string; type?: string };
  return value.assetCode ?? value.contractAddress ?? (value.type === 'native' ? 'XLM' : 'Asset');
}

export function BlendPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const markets = useQuery({
    queryKey: ['blend', 'markets', network],
    queryFn: () => blendApi.markets(network),
    staleTime: 30_000,
  });
  const positions = useQuery({
    queryKey: ['blend', 'positions', address, network],
    queryFn: () => blendApi.positions(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  const yields = useQuery({
    queryKey: ['blend', 'yield', network],
    queryFn: () => blendApi.yield(network),
    staleTime: 30_000,
  });
  const risk = useQuery({
    queryKey: ['blend', 'risk', address, network],
    queryFn: () => blendApi.risk(address as string, network),
    enabled: Boolean(address),
    staleTime: 30_000,
  });
  const error = markets.error ?? positions.error ?? yields.error ?? risk.error;

  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to open Blend"
        description="Blend positions and transaction preparation are account-specific. Financial OS never requests a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  if (error)
    return (
      <ErrorState
        title="Blend data unavailable"
        description={
          error instanceof Error
            ? error.message
            : 'The configured Blend provider could not be reached.'
        }
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => {
              void markets.refetch();
              void positions.refetch();
              void yields.refetch();
              void risk.refetch();
            }}
          >
            Retry
          </button>
        }
      />
    );
  const loading = markets.isLoading || positions.isLoading || yields.isLoading || risk.isLoading;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="DeFi / Lending"
        title="Blend"
        description="Pool reserves, lending rates, account positions, rewards, and health context from the current Blend SDK."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      {loading ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-3">
            <Metric
              title="Health status"
              value={risk.data?.[0]?.value ?? 'No borrow exposure'}
              tone={risk.data?.[0]?.severity === 'high' ? 'negative' : 'positive'}
            />
            <Metric title="Markets discovered" value={String(markets.data?.length ?? 0)} />
            <Metric title="Yield sources" value={String(yields.data?.length ?? 0)} />
          </div>
          <section className="space-y-3">
            <SectionHeader
              title="Markets & reserves"
              description="Supply and borrow data is sourced from configured Blend pools; unavailable values remain unavailable."
            />
            {markets.data?.length ? (
              markets.data.map((market) => <MarketCard key={market.id} market={market} />)
            ) : (
              <Card className="p-6">
                <EmptyState
                  title="No Blend pools configured"
                  description="Configure verified pool IDs and network RPC settings on the API before market data is shown."
                />
              </Card>
            )}
          </section>
          <section className="space-y-3">
            <SectionHeader
              title="Your positions"
              description="Supplied balances, collateral, borrow balances, and claimable rewards."
            />
            {positions.data?.length ? (
              <div className="grid gap-3 md:grid-cols-2">
                {positions.data.map((position) => (
                  <PositionCard key={position.id} position={position} />
                ))}
              </div>
            ) : (
              <Card className="p-6">
                <EmptyState
                  title="No Blend positions"
                  description="Synchronized positions will appear here once the account has activity in a configured pool."
                />
              </Card>
            )}
          </section>
          <section className="space-y-3">
            <SectionHeader
              title="Actions"
              description="Every operation is built as an unsigned transaction, simulated through Stellar RPC, and previewed before wallet signing."
            />
            <Card className="grid gap-3 p-5 sm:grid-cols-5">
              {['Supply', 'Withdraw', 'Borrow', 'Repay', 'Claim'].map((action) => (
                <div key={action} className="rounded-lg border border-white/[0.08] p-4">
                  <p className="font-medium">{action}</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                    Select a market and amount to prepare
                  </p>
                </div>
              ))}
            </Card>
          </section>
        </>
      )}
    </div>
  );
}

function Metric({
  title,
  value,
  tone = 'neutral',
}: {
  title: string;
  value: string;
  tone?: 'neutral' | 'positive' | 'negative';
}) {
  return (
    <Card className="p-5">
      <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--muted))]">{title}</p>
      <p
        className={`mt-3 text-2xl font-semibold ${tone === 'negative' ? 'text-[hsl(var(--negative))]' : tone === 'positive' ? 'text-[hsl(var(--positive))]' : ''}`}
      >
        {value}
      </p>
    </Card>
  );
}
function MarketCard({ market }: { market: BlendMarket }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between border-b border-white/[0.08] px-5 py-4">
        <div>
          <p className="font-medium">{market.name}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">{market.id}</p>
        </div>
        <StatusBadge tone={market.enabled ? 'positive' : 'warning'}>
          {market.enabled ? 'Active' : 'Inactive'}
        </StatusBadge>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="text-xs text-[hsl(var(--muted))]">
            <tr>
              <th className="px-5 py-3">Reserve</th>
              <th className="px-5 py-3">Supply APY</th>
              <th className="px-5 py-3">Borrow APY</th>
              <th className="px-5 py-3">Utilization</th>
            </tr>
          </thead>
          <tbody>
            {market.reserves?.map((reserve) => (
              <tr key={assetLabel(reserve.asset)} className="border-t border-white/[0.06]">
                <td className="px-5 py-3">{assetLabel(reserve.asset)}</td>
                <td className="px-5 py-3 tabular-nums">{format(reserve.supplyApy)}</td>
                <td className="px-5 py-3 tabular-nums">{format(reserve.borrowApy)}</td>
                <td className="px-5 py-3 tabular-nums">{format(reserve.utilization)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
function PositionCard({ position }: { position: BlendPosition }) {
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-medium capitalize">{position.kind}</p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {position.marketId ?? 'Market unavailable'}
          </p>
        </div>
        <StatusBadge tone={position.kind === 'borrow' ? 'warning' : 'positive'}>
          {position.healthRatio ? `Health ${position.healthRatio}` : 'No health ratio'}
        </StatusBadge>
      </div>
      <div className="mt-5 space-y-2">
        {position.assets.map((item, index) => (
          <div className="flex justify-between text-sm" key={`${assetLabel(item.asset)}-${index}`}>
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
