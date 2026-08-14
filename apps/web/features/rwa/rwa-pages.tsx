'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useWallet } from '../../lib/wallet/context';
import { useSession } from '../../lib/session/context';
import { clientEnv } from '../../lib/config/env';
import { useDashboardData } from '../dashboard/use-dashboard-data';
import type { PortfolioAllocation } from '../dashboard/dashboard-api';
import { rwaApi, type RwaRecord } from './rwa-api';
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  MetricCard,
  PageHeader,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';

function text(value: string | null | undefined, fallback = 'Unknown') {
  return value ?? fallback;
}
function money(value: string | null | undefined) {
  if (value == null) return 'Unknown';
  const [whole = '0', fraction = ''] = value.split('.');
  return `$${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}${fraction ? `.${fraction.slice(0, 2).padEnd(2, '0')}` : '.00'}`;
}
function holdingFor(rows: readonly PortfolioAllocation[], assetId: string) {
  return rows.find((row) => row.asset === assetId);
}
function productLabel(product: RwaRecord) {
  return product.productName ?? product.assetCode ?? product.assetId;
}
function statusTone(value: RwaRecord['verification']) {
  return value === 'verified' ? 'positive' : value === 'unknown' ? 'neutral' : 'warning';
}

function RwaLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-28" />
      <div className="grid gap-4 lg:grid-cols-3">
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
        <Skeleton className="h-44" />
      </div>
      <Skeleton className="h-96" />
    </div>
  );
}

function RwaRow({ product, holding }: { product: RwaRecord; holding?: PortfolioAllocation }) {
  return (
    <Link
      href={`/rwa/${encodeURIComponent(product.assetId)}`}
      className="grid gap-4 border-b border-white/[0.06] px-5 py-5 transition-colors last:border-0 hover:bg-white/[0.03] md:grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] md:items-center"
    >
      <div className="min-w-0">
        <p className="truncate font-medium">{productLabel(product)}</p>
        <p className="mt-1 truncate text-xs text-[hsl(var(--muted))]">
          {text(product.manager)} · {text(product.instrumentType)} · {product.network}
        </p>
      </div>
      <span className="text-sm">{text(product.denomination)}</span>
      <span className="tabular-nums">
        {money(product.nav)}
        <small className="ml-1 text-[10px] text-[hsl(var(--muted))]">NAV</small>
      </span>
      <span className="tabular-nums">
        {product.indicatedYield ? `${product.indicatedYield}%` : 'Unknown'}
      </span>
      <span className="tabular-nums">
        {holding?.quantity ?? '—'}
        {holding?.value ? (
          <small className="ml-1 text-[10px] text-[hsl(var(--muted))]">
            {money(holding.value)}
          </small>
        ) : null}
      </span>
      <span className="text-xs text-[hsl(var(--muted))]">Unknown liquidity</span>
      <StatusBadge tone={statusTone(product.verification)}>{product.verification}</StatusBadge>
    </Link>
  );
}

export function RwaDirectoryPage() {
  const wallet = useWallet();
  const { session } = useSession();
  const network =
    wallet.network ??
    (session?.network as 'testnet' | 'mainnet' | undefined) ??
    clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const [search, setSearch] = useState('');
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const products = useQuery({
    queryKey: ['rwa', network],
    queryFn: () => rwaApi.list(network),
    staleTime: 60_000,
  });
  const portfolio = useDashboardData();
  const filtered = useMemo(
    () =>
      (products.data ?? [])
        .filter((product) =>
          `${productLabel(product)} ${product.manager ?? ''} ${product.instrumentType ?? ''} ${product.denomination ?? ''}`
            .toLowerCase()
            .includes(search.toLowerCase().trim()),
        )
        .filter((product) => !verifiedOnly || product.verification === 'verified'),
    [products.data, search, verifiedOnly],
  );
  const rows = portfolio.query.data?.byAsset ?? [];
  if (products.isLoading) return <RwaLoading />;
  if (products.isError)
    return (
      <ErrorState
        title="RWA desk unavailable"
        description="The verified product registry could not be reached."
        action={<Button onClick={() => void products.refetch()}>Retry</Button>}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Institutional product desk"
        title="Real-world assets"
        description="Tokenized financial products presented with manager, instrument, NAV, restrictions, and source context."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="p-5">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <input
            value={search}
            onChange={(event) => setSearch((event.target as unknown as { value: string }).value)}
            placeholder="Search manager, product, instrument…"
            className="h-10 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 text-sm outline-none focus:border-[hsl(var(--accent))]"
          />
          <Button
            size="sm"
            variant={verifiedOnly ? 'primary' : 'secondary'}
            onClick={() => setVerifiedOnly((value) => !value)}
          >
            Verified products
          </Button>
        </div>
      </Card>
      {!filtered.length ? (
        <EmptyState
          title="No RWA products found"
          description="The registry has no products matching this search or filter."
          action={!wallet.address ? <ConnectWalletButton /> : undefined}
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="hidden grid-cols-[1.5fr_1fr_1fr_1fr_1fr_1fr_auto] gap-4 border-b border-white/[0.08] px-5 py-3 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))] md:grid">
            <span>Manager / product</span>
            <span>Currency</span>
            <span>NAV</span>
            <span>Indicated yield</span>
            <span>Your holding</span>
            <span>Liquidity</span>
            <span>Status</span>
          </div>
          {filtered.map((product) => (
            <RwaRow
              key={product.assetId}
              product={product}
              holding={holdingFor(rows, product.assetId)}
            />
          ))}
        </Card>
      )}
      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard
          label="Verified products"
          value={String(filtered.filter((product) => product.verification === 'verified').length)}
          change="Canonical identity matched"
          tone="positive"
        />
        <MetricCard
          label="Holdings discovered"
          value={String(
            rows.filter((row) => row.category === 'rwa' || row.category === 'fund').length,
          )}
          change={portfolio.enabled ? 'Connected account' : 'Connect wallet for exposure'}
          tone="accent"
        />
        <MetricCard
          label="Liquidity"
          value="Unknown"
          change="Shown only when sourced"
          tone="neutral"
        />
      </div>
      <p className="text-xs leading-5 text-[hsl(var(--muted))]">
        Indicated yield, NAV, eligibility, restrictions, and liquidity are shown only when supplied
        by the product source. A product ticker never establishes identity or compliance status.
      </p>
    </div>
  );
}

function Field({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string | null | undefined;
  mono?: boolean;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))]">{label}</p>
      <p className={`mt-1 break-words text-sm ${mono ? 'font-mono text-xs' : ''}`}>
        {value ?? 'Unknown'}
      </p>
    </div>
  );
}
function UnknownPanel({ title, description }: { title: string; description: string }) {
  return (
    <Card className="p-5">
      <SectionHeader title={title} />
      <EmptyState title="Unavailable" description={description} />
    </Card>
  );
}

export function RwaDetailPage({ assetId }: { assetId: string }) {
  const wallet = useWallet();
  const detail = useQuery({
    queryKey: ['rwa', assetId],
    queryFn: () => rwaApi.get(assetId),
    staleTime: 60_000,
  });
  const portfolio = useDashboardData();
  if (detail.isLoading) return <RwaLoading />;
  if (detail.isError)
    return (
      <ErrorState
        title="RWA product unavailable"
        description="No verified RWA metadata was found for this canonical asset identity."
        action={<Button onClick={() => void detail.refetch()}>Retry</Button>}
      />
    );
  const product = detail.data;
  if (!product) return <EmptyState title="RWA product not found" />;
  const holding = holdingFor(portfolio.query.data?.byAsset ?? [], product.assetId);
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Institutional product desk"
        title={productLabel(product)}
        description={`${text(product.manager)} · ${text(product.instrumentType)} · ${product.network}`}
        actions={
          <StatusBadge tone={statusTone(product.verification)}>{product.verification}</StatusBadge>
        }
      />
      <Card className="p-5 sm:p-7">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
              Canonical product identity
            </p>
            <h2 className="mt-2 text-2xl font-semibold">{productLabel(product)}</h2>
            <p className="mt-2 break-all font-mono text-xs text-[hsl(var(--muted))]">
              {product.assetId}
            </p>
          </div>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            <Field label="NAV" value={money(product.nav)} />
            <Field
              label="Indicated yield"
              value={product.indicatedYield ? `${product.indicatedYield}%` : null}
            />
            <Field label="Currency" value={product.denomination} />
            <Field
              label="Freshness"
              value={product.freshness ? new Date(product.freshness).toLocaleDateString() : null}
            />
          </div>
        </div>
      </Card>
      <section className="grid gap-6 lg:grid-cols-3">
        <Card className="p-5">
          <SectionHeader title="Overview" />
          <div className="grid gap-5">
            <Field label="Instrument" value={product.instrumentType} />
            <Field label="Jurisdiction" value={product.jurisdiction} />
            <Field label="Asset type" value={product.assetType} />
            <Field label="Verification" value={product.verification} />
          </div>
        </Card>
        <Card className="p-5">
          <SectionHeader title="Holding" />
          <div className="grid gap-5">
            <Field label="Balance" value={holding?.quantity} />
            <Field label="Value" value={holding?.value ? money(holding.value) : null} />
            <Field label="Portfolio exposure" value="Unknown" />
            <Field label="Eligibility" value={product.eligibilityRequirements} />
          </div>
          {!wallet.address ? (
            <p className="mt-5 text-xs text-[hsl(var(--muted))]">
              Connect a wallet to load your holding.
            </p>
          ) : null}
        </Card>
        <Card className="p-5">
          <SectionHeader title="NAV & yield" />
          <div className="grid gap-5">
            <Field
              label="NAV"
              value={product.nav ? `${product.nav} ${text(product.denomination)}` : null}
            />
            <Field
              label="NAV timestamp"
              value={product.navTimestamp ? new Date(product.navTimestamp).toLocaleString() : null}
            />
            <Field
              label="Indicated yield"
              value={product.indicatedYield ? `${product.indicatedYield}%` : null}
            />
            <Field
              label="Yield timestamp"
              value={
                product.yieldTimestamp ? new Date(product.yieldTimestamp).toLocaleString() : null
              }
            />
          </div>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Manager / issuer" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Manager" value={product.manager} />
            <Field label="Issuer" value={product.issuer} mono />
            <Field label="Official source" value={product.source} />
            <Field label="Network" value={product.network} />
          </div>
          {product.officialUrl ? (
            <a
              className="mt-5 block truncate text-sm text-[hsl(var(--accent))] hover:underline"
              href={product.officialUrl}
              target="_blank"
              rel="noreferrer"
            >
              Official product information ↗
            </a>
          ) : null}
        </Card>
        <Card className="p-5">
          <SectionHeader title="Underlying exposure" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Category" value={product.underlyingAssetCategory} />
            <Field label="Duration" value={product.duration} />
            <Field
              label="Maturity"
              value={product.maturity ? new Date(product.maturity).toLocaleDateString() : null}
            />
            <Field label="Denomination" value={product.denomination} />
          </div>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-2">
        <Card className="p-5">
          <SectionHeader title="Disclosures" />
          <p className="text-sm leading-6 text-[hsl(var(--muted))]">
            Disclosures are available only when the issuer provides a verified URL.
          </p>
          {product.disclosuresUrl ? (
            <a
              className="mt-5 block break-all text-sm text-[hsl(var(--accent))] hover:underline"
              href={product.disclosuresUrl}
              target="_blank"
              rel="noreferrer"
            >
              Read product disclosures ↗
            </a>
          ) : null}
        </Card>
        <Card className="p-5">
          <SectionHeader title="Restrictions" />
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Transfer restrictions" value={product.transferRestrictions} />
            <Field label="Eligibility requirements" value={product.eligibilityRequirements} />
          </div>
          <p className="mt-5 text-xs leading-5 text-[hsl(var(--muted))]">
            Unknown does not mean unrestricted or eligible. Confirm terms with the issuer.
          </p>
        </Card>
      </section>
      <section className="grid gap-6 lg:grid-cols-3">
        <UnknownPanel
          title="Liquidity"
          description="No trusted liquidity indication is available from the current RWA API."
        />
        <UnknownPanel
          title="DeFi integrations"
          description="No verified DeFi use or collateral integration is available from the current API."
        />
        <UnknownPanel
          title="Activity"
          description="RWA-specific activity indexing is not available yet."
        />
      </section>
    </div>
  );
}
