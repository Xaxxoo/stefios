'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../../lib/wallet/context';
import { useSession } from '../../lib/session/context';
import { clientEnv } from '../../lib/config/env';
import { useDashboardData } from '../dashboard/use-dashboard-data';
import { assetsApi, type AssetRecord } from './assets-api';
import {
  AssetAvatar,
  Button,
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SearchInput,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';

const categories = ['All', 'Stablecoins', 'RWA', 'DeFi', 'Other'] as const;
type AssetFilter = (typeof categories)[number];

function label(asset: AssetRecord) {
  return asset.symbol ?? asset.name ?? asset.assetId;
}
function identity(asset: AssetRecord) {
  return asset.type === 'classic'
    ? `Classic · ${asset.issuer ?? 'issuer unavailable'}`
    : asset.type === 'contract'
      ? `Contract · ${asset.contract ?? 'contract unavailable'}`
      : 'Native asset';
}
function categoryMatch(asset: AssetRecord, filter: AssetFilter) {
  if (filter === 'All') return true;
  const category = asset.category?.toLowerCase() ?? 'other';
  if (filter === 'Other') return !['stablecoin', 'stablecoins', 'rwa', 'defi'].includes(category);
  return filter.toLowerCase() === category || (filter === 'RWA' && category === 'fund');
}

function AssetListRow({
  asset,
  balance,
  value,
}: {
  asset: AssetRecord;
  balance?: string;
  value?: string | null;
}) {
  return (
    <Link
      href={`/assets/${encodeURIComponent(asset.assetId)}`}
      className="grid grid-cols-[minmax(170px,1.3fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] items-center gap-4 border-b border-white/[0.06] px-5 py-4 text-sm transition-colors last:border-0 hover:bg-white/[0.03]"
    >
      <div className="flex min-w-0 items-center gap-3">
        <AssetAvatar symbol={label(asset)} size="md" />
        <div className="min-w-0">
          <p className="truncate font-medium">{label(asset)}</p>
          <p className="truncate text-xs text-[hsl(var(--muted))]">{identity(asset)}</p>
        </div>
      </div>
      <span className="truncate text-xs text-[hsl(var(--muted))]">{asset.network}</span>
      <span className="tabular-nums">
        {balance ?? '—'}
        {value ? <span className="ml-2 text-xs text-[hsl(var(--muted))]">{value}</span> : null}
      </span>
      <StatusBadge tone={asset.verification === 'verified' ? 'positive' : 'warning'}>
        {asset.verification}
      </StatusBadge>
    </Link>
  );
}

export function AssetsPage() {
  const { address } = useWallet();
  const { session } = useSession();
  const network =
    useWallet().network ??
    (session?.network as 'testnet' | 'mainnet' | undefined) ??
    clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<AssetFilter>('All');
  const [verified, setVerified] = useState(false);
  const [rwaOnly, setRwaOnly] = useState(false);
  const assets = useQuery({
    queryKey: ['assets', network, query],
    queryFn: () => (query.trim() ? assetsApi.search(query, network) : assetsApi.list(network)),
    staleTime: 60_000,
  });
  const portfolio = useDashboardData();
  const balances = useMemo(
    () => new Map((portfolio.query.data?.byAsset ?? []).map((row) => [row.asset, row])),
    [portfolio.query.data],
  );
  const filtered = (assets.data ?? [])
    .filter((asset) => categoryMatch(asset, filter))
    .filter((asset) => !verified || asset.verification === 'verified')
    .filter((asset) => !rwaOnly || ['rwa', 'fund'].includes(asset.category?.toLowerCase() ?? ''));
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Holdings / Directory"
        title="Assets"
        description="Discover assets by canonical identity—not ticker alone."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="p-4">
        <div className="flex flex-col gap-3 lg:flex-row">
          <SearchInput
            value={query}
            onChange={(event) => setQuery((event.target as unknown as { value: string }).value)}
            placeholder="Search symbol, issuer, contract…"
            className="flex-1"
          />
          <div className="flex gap-2 overflow-x-auto">
            {categories.map((item) => (
              <button
                key={item}
                onClick={() => setFilter(item)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs ${filter === item ? 'border-[hsl(var(--accent))]/40 bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]' : 'border-white/[0.08] text-[hsl(var(--muted))]'}`}
              >
                {item}
              </button>
            ))}
            <Button
              size="sm"
              variant={verified ? 'primary' : 'secondary'}
              onClick={() => setVerified((value) => !value)}
            >
              Verified
            </Button>
            <Button
              size="sm"
              variant={rwaOnly ? 'primary' : 'secondary'}
              onClick={() => setRwaOnly((value) => !value)}
            >
              RWA
            </Button>
          </div>
        </div>
      </Card>
      {assets.isLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : assets.isError ? (
        <ErrorState
          title="Asset directory unavailable"
          description="The asset registry could not be reached."
          action={<Button onClick={() => void assets.refetch()}>Retry</Button>}
        />
      ) : !filtered.length ? (
        <EmptyState
          title="No matching assets"
          description="Try a broader search or remove a filter."
          action={!address ? <ConnectWalletButton /> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[minmax(170px,1.3fr)_minmax(120px,1fr)_minmax(120px,1fr)_auto] gap-4 border-b border-white/[0.08] px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))] md:grid">
            <span>Asset identity</span>
            <span>Network</span>
            <span>Balance / value</span>
            <span>Verification</span>
          </div>
          <div className="divide-y divide-white/[0.06]">
            {filtered.map((asset) => {
              const row = balances.get(asset.assetId);
              return (
                <AssetListRow
                  key={asset.assetId}
                  asset={asset}
                  balance={row?.quantity}
                  value={row?.value ? `$${row.value}` : undefined}
                />
              );
            })}
          </div>
        </Card>
      )}
      <p className="text-xs text-[hsl(var(--muted))]">
        Balances and valuations are shown only for the connected account and trusted quotes. A
        matching symbol does not establish verification.
      </p>
    </div>
  );
}

function DetailField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))]">{label}</p>
      <p className={`mt-1 break-all text-sm ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? 'Unknown'}
      </p>
    </div>
  );
}

export function AssetDetailPage({ assetId }: { assetId: string }) {
  const { session } = useSession();
  const { network } = useWallet();
  const detail = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => assetsApi.get(assetId),
    staleTime: 60_000,
  });
  const portfolio = useDashboardData();
  const row = portfolio.query.data?.byAsset.find((item) => item.asset === assetId);
  if (detail.isLoading)
    return (
      <div className="space-y-6" aria-busy="true">
        <Skeleton className="h-28" />
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  if (detail.isError)
    return (
      <ErrorState
        title="Asset unavailable"
        description="This canonical asset identity could not be resolved."
        action={<Button onClick={() => void detail.refetch()}>Retry</Button>}
      />
    );
  const asset = detail.data;
  if (!asset) return <EmptyState title="Asset not found" />;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Asset intelligence"
        title={label(asset)}
        description={asset.name ?? 'Identity-first asset detail'}
        actions={
          <StatusBadge tone={asset.verification === 'verified' ? 'positive' : 'warning'}>
            {asset.verification}
          </StatusBadge>
        }
      />
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <AssetAvatar symbol={label(asset)} size="lg" />
          <div className="min-w-0">
            <h2 className="text-xl font-semibold">{asset.name ?? label(asset)}</h2>
            <p className="mt-1 text-sm text-[hsl(var(--muted))]">
              {identity(asset)} · {asset.network}
            </p>
            <p className="mt-3 break-all font-mono text-[11px] text-[hsl(var(--muted))]">
              Canonical ID · {asset.assetId}
            </p>
          </div>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <DetailField label="Issuer" value={asset.issuer} mono />
          <DetailField label="Contract" value={asset.contract} mono />
          <DetailField label="Domain" value={asset.domain} />
          <DetailField label="Category" value={asset.category} />
        </div>
      </Card>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Your exposure" description="Connected-account data only." />
          <div className="grid gap-5 sm:grid-cols-3">
            <DetailField label="Balance" value={row?.quantity} />
            <DetailField label="Portfolio value" value={row?.value ? `$${row.value}` : undefined} />
            <DetailField label="Portfolio weight" value="Unknown" />
          </div>
          {!session || !network ? (
            <p className="mt-5 text-sm text-[hsl(var(--muted))]">
              Connect and synchronize a wallet to load account exposure.
            </p>
          ) : null}
        </Card>
        <Card className="p-5">
          <SectionHeader title="Market context" description="No quote is implied by the ticker." />
          <div className="grid gap-5 sm:grid-cols-2">
            <DetailField label="Price" value={row?.price ? `$${row.price}` : undefined} />
            <DetailField label="Yield" value={row?.apy ? `${row.apy}%` : undefined} />
            <DetailField label="Liquidity" value="Unknown" />
            <DetailField label="DeFi availability" value="Unknown" />
          </div>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader
            title="Metadata"
            description="Sanitized registry and issuer information."
          />
          <p className="text-sm leading-6 text-[hsl(var(--muted))]">
            {asset.description ?? 'No description is available from verified metadata.'}
          </p>
          {asset.links.length ? (
            <div className="mt-5 space-y-2">
              {asset.links.map((link) => (
                <a
                  className="block truncate text-sm text-[hsl(var(--accent))] hover:underline"
                  href={link}
                  key={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {link}
                </a>
              ))}
            </div>
          ) : null}
        </Card>
        <Card className="p-5">
          <SectionHeader
            title="Identity protection"
            description="Verification is based on canonical identifiers and official metadata."
          />
          <p className="text-sm leading-6 text-[hsl(var(--muted))]">
            {asset.verification === 'verified'
              ? 'This asset matched verified issuer or contract metadata.'
              : 'This asset is not verified. Treat a matching ticker or name as untrusted until issuer, contract, network, and official metadata agree.'}
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <StatusBadge tone="info">{asset.network}</StatusBadge>
            <StatusBadge tone={asset.verification === 'verified' ? 'positive' : 'warning'}>
              {asset.verification}
            </StatusBadge>
          </div>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <SectionHeader title="Price chart" />
          <EmptyState
            title="No historical quotes"
            description="A chart will appear when a trusted price history provider is connected."
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Activity" />
          <EmptyState
            title="No asset activity"
            description="Activity indexing is not available for this asset yet."
          />
        </Card>
        <Card className="p-5">
          <SectionHeader title="Markets & actions" />
          <EmptyState
            title="No verified markets"
            description="Related swaps and DeFi actions will appear only after integrations are available."
          />
        </Card>
      </section>
    </div>
  );
}
