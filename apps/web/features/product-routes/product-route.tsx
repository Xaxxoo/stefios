'use client';

import Link from 'next/link';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';

export type ProductRouteKey =
  | 'portfolio'
  | 'assets'
  | 'asset-detail'
  | 'rwa'
  | 'rwa-detail'
  | 'defi'
  | 'blend'
  | 'aquarius'
  | 'sushi'
  | 'templar'
  | 'yield'
  | 'risk'
  | 'swap'
  | 'payments'
  | 'send'
  | 'receive'
  | 'ramps'
  | 'cross-chain'
  | 'activity'
  | 'transaction'
  | 'watchlist'
  | 'alerts'
  | 'institutional'
  | 'wallets'
  | 'security';

const routeCopy: Record<
  ProductRouteKey,
  { eyebrow: string; title: string; description: string; empty: string }
> = {
  portfolio: {
    eyebrow: 'Command center',
    title: 'Portfolio',
    description: 'A normalized view of balances, positions, liabilities, and exposure.',
    empty: 'Portfolio data will appear after your account is synchronized.',
  },
  assets: {
    eyebrow: 'Holdings',
    title: 'Assets',
    description: 'Discover native assets, issued assets, contract tokens, and verified metadata.',
    empty: 'No synchronized assets are available yet.',
  },
  'asset-detail': {
    eyebrow: 'Asset intelligence',
    title: 'Asset detail',
    description: 'Canonical identity, market context, and source-aware metadata for one asset.',
    empty: 'This asset has no available metadata for the connected account.',
  },
  rwa: {
    eyebrow: 'Real-world assets',
    title: 'RWA desk',
    description: 'Tokenized financial products alongside the rest of your Stellar portfolio.',
    empty: 'No verified RWA products are available for this network.',
  },
  'rwa-detail': {
    eyebrow: 'Real-world assets',
    title: 'RWA product',
    description: 'Issuer, instrument, NAV, disclosures, and eligibility when sourced.',
    empty: 'This product has no verified metadata available yet.',
  },
  defi: {
    eyebrow: 'Open finance',
    title: 'DeFi',
    description: 'Protocol positions, liquidity, lending, rewards, and market context.',
    empty: 'No synchronized DeFi positions are available yet.',
  },
  blend: {
    eyebrow: 'DeFi / Lending',
    title: 'Blend',
    description: 'Supply, borrow, collateral, and health context from synchronized positions.',
    empty: 'No Blend positions are available for the connected account.',
  },
  aquarius: {
    eyebrow: 'DeFi / Liquidity',
    title: 'Aquarius',
    description: 'Swap and liquidity exposure from synchronized account data.',
    empty: 'No Aquarius positions are available for the connected account.',
  },
  sushi: {
    eyebrow: 'DeFi / Liquidity',
    title: 'Sushi',
    description: 'Liquidity exposure and position context when indexed.',
    empty: 'No Sushi positions are available for the connected account.',
  },
  templar: {
    eyebrow: 'DeFi / Lending',
    title: 'Templar',
    description: 'Collateral and borrowing exposure when indexed.',
    empty: 'No Templar positions are available for the connected account.',
  },
  yield: {
    eyebrow: 'Returns',
    title: 'Yield',
    description: 'Source-aware yield snapshots and opportunities across connected protocols.',
    empty: 'No sourced yield opportunities are available yet.',
  },
  risk: {
    eyebrow: 'Portfolio intelligence',
    title: 'Risk',
    description: 'Concentration, liquidity, leverage, and health signals for your capital.',
    empty: 'Risk analysis will appear after risk data is synchronized.',
  },
  swap: {
    eyebrow: 'Execution',
    title: 'Swap',
    description: 'Prepare wallet-signed swaps with simulation and human-readable previews.',
    empty: 'Swap execution is not enabled for this account yet.',
  },
  payments: {
    eyebrow: 'Money movement',
    title: 'Payments',
    description: 'Understand and prepare Stellar payments from your connected wallet.',
    empty: 'No payment history is available yet.',
  },
  send: {
    eyebrow: 'Payments',
    title: 'Send payment',
    description: 'Prepare a wallet-signed payment with a clear transaction preview.',
    empty: 'Payment preparation is not enabled yet.',
  },
  receive: {
    eyebrow: 'Payments',
    title: 'Receive',
    description: 'Share your wallet identity and inspect supported receiving assets.',
    empty: 'Receiving details are not available until a wallet is connected.',
  },
  ramps: {
    eyebrow: 'Money movement',
    title: 'Anchors & ramps',
    description: 'Track on-ramp and off-ramp activity from supported anchor providers.',
    empty: 'No anchor transactions are available yet.',
  },
  'cross-chain': {
    eyebrow: 'Settlement',
    title: 'Cross-chain',
    description: 'Monitor transfers between Stellar and connected destination networks.',
    empty: 'No cross-chain transfers are available yet.',
  },
  activity: {
    eyebrow: 'Audit trail',
    title: 'Activity',
    description: 'A normalized timeline of transactions, operations, and payments.',
    empty: 'No account activity is available yet.',
  },
  transaction: {
    eyebrow: 'Audit trail',
    title: 'Transaction',
    description: 'Inspect one transaction with source-aware status and operation details.',
    empty: 'This transaction is not available for the connected account.',
  },
  watchlist: {
    eyebrow: 'Workspace',
    title: 'Watchlist',
    description: 'Keep important assets and products close to your operating view.',
    empty: 'Your watchlist is empty.',
  },
  alerts: {
    eyebrow: 'Workspace',
    title: 'Alerts',
    description: 'Configure signals for risk, price, liquidity, and account events.',
    empty: 'No alert rules have been configured.',
  },
  institutional: {
    eyebrow: 'Institutional',
    title: 'Capital management',
    description: 'Multi-account monitoring, reporting, and treasury workflows.',
    empty: 'No managed accounts are configured yet.',
  },
  wallets: {
    eyebrow: 'Settings',
    title: 'Wallets',
    description: 'Review connected wallet identities and network access.',
    empty: 'No wallet connections are available.',
  },
  security: {
    eyebrow: 'Settings',
    title: 'Security',
    description: 'Review sessions, signing boundaries, and account security controls.',
    empty: 'No additional security events are available.',
  },
};

function RouteLoading() {
  return (
    <div className="space-y-6" aria-busy="true">
      <Skeleton className="h-24" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}

export function ProductRoute({ kind, detail }: { kind: ProductRouteKey; detail?: string }) {
  const { session, loading } = useSession();
  const { address, error: walletError } = useWallet();
  const copy = routeCopy[kind];
  if (loading) return <RouteLoading />;
  if (walletError)
    return (
      <ErrorState
        title="Wallet access error"
        description={walletError}
        action={<ConnectWalletButton />}
      />
    );
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to continue"
        description="Financial OS uses your wallet for identity and signing. It never asks for a secret key or seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow={copy.eyebrow}
        title={detail ? `${copy.title} · ${detail}` : copy.title}
        description={copy.description}
        actions={
          <>
            <StatusBadge tone="positive">{session.network}</StatusBadge>
            <Link
              className="inline-flex h-8 items-center justify-center rounded-md border border-white/10 bg-white/[0.06] px-3 text-xs font-medium hover:bg-white/[0.1]"
              href="/dashboard"
            >
              Overview
            </Link>
          </>
        }
      />
      <Card className="p-5 sm:p-8">
        <EmptyState
          title="Nothing to show yet"
          description={copy.empty}
          action={
            <Link
              className="inline-flex h-9 items-center justify-center rounded-md border border-transparent bg-[hsl(var(--accent))] px-4 text-sm font-medium text-[hsl(var(--background))] hover:brightness-110"
              href="/dashboard"
            >
              Return to dashboard
            </Link>
          }
        />
      </Card>
    </div>
  );
}
