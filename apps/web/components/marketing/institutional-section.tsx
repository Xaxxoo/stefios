import Link from 'next/link';
import { Card, GlassPanel, StatusBadge } from '../ui/design-system';

const operatingViews = [
  ['Multi-account monitoring', 'Keep connected and view-only accounts in one reporting surface.'],
  [
    'RWA exposure',
    'See tokenized funds, treasury exposure, and cash products beside native assets.',
  ],
  [
    'Liquidity and yield',
    'Compare available liquidity, protocol positions, and sourced yield context.',
  ],
  [
    'Risk and reporting',
    'Follow concentration, liabilities, capital flows, and transaction history.',
  ],
  [
    'Treasury workflows',
    'Organize approvals, payment activity, and account-level operating context.',
  ],
];

const controls = [
  'Non-custodial architecture',
  'Wallet-owned signing',
  'Transaction simulation',
  'Human-readable previews',
  'Verified asset identities',
  'No private keys stored',
];
const ecosystem: readonly [string, string, boolean][] = [
  ['Stellar', 'Network foundation', true],
  ['Real-world assets', 'Designed for sourced product metadata', false],
  ['Lending', 'Designed for supply, borrow, and collateral context', false],
  ['Liquidity', 'Designed for swaps and liquidity positions', false],
  ['Payments and anchors', 'Designed for rails and transaction tracking', false],
  ['Cross-chain providers', 'Designed for destination monitoring', false],
];

export function InstitutionalSection() {
  return (
    <section
      id="institutions"
      className="border-y border-white/[0.06] bg-[hsl(var(--surface-1))] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[.8fr_1.2fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
              For institutions and serious operators
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
              One view for the capital you manage.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[hsl(var(--muted))]">
              Bring accounts, assets, protocols, payments, and reporting into a shared operating
              picture—while keeping authority with the wallets that control the funds.
            </p>
            <Link
              href="/dashboard"
              className="mt-8 inline-flex h-10 items-center rounded-md border border-white/10 bg-white/[0.05] px-4 text-sm font-medium hover:bg-white/[0.09]"
            >
              Explore the command center →
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {operatingViews.map(([title, body], index) => (
              <Card key={title} className={`p-5 ${index === 0 ? 'sm:col-span-2' : ''}`}>
                <span className="text-xs tabular-nums text-[hsl(var(--accent))]">0{index + 1}</span>
                <h3 className="mt-8 text-lg font-medium">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted))]">{body}</p>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export function SecuritySection() {
  return (
    <section id="security" className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="mx-auto max-w-7xl">
        <div className="grid gap-12 lg:grid-cols-[1fr_1fr] lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
              Security boundary
            </p>
            <h2 className="mt-4 max-w-xl text-4xl font-semibold tracking-tight sm:text-6xl">
              Control stays with the wallet.
            </h2>
            <p className="mt-6 max-w-xl text-base leading-7 text-[hsl(var(--muted))]">
              Financial OS is designed to help you understand and prepare activity without becoming
              the custodian of your assets or signing authority.
            </p>
          </div>
          <GlassPanel className="p-5 sm:p-7">
            <div className="flex items-center justify-between border-b border-white/[0.08] pb-4">
              <span className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
                Security posture
              </span>
              <StatusBadge tone="positive">Non-custodial</StatusBadge>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {controls.map((control) => (
                <div
                  key={control}
                  className="rounded-lg border border-white/[0.07] bg-white/[0.025] p-3 text-sm"
                >
                  <span className="mr-2 text-[hsl(var(--positive))]">✓</span>
                  {control}
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs leading-5 text-[hsl(var(--muted))]">
              No audit or certification claim is implied. Security controls and provider behavior
              should be independently evaluated before production use.
            </p>
          </GlassPanel>
        </div>
      </div>
    </section>
  );
}

export function EcosystemSection() {
  return (
    <section
      id="developers"
      className="border-y border-white/[0.06] bg-[hsl(var(--surface-1))] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto max-w-7xl">
        <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
              Ecosystem map
            </p>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
              Designed around the Stellar capital stack.
            </h2>
          </div>
          <p className="max-w-md text-sm leading-6 text-[hsl(var(--muted))]">
            The operating model is ready for a broad ecosystem. “Integrated” means a verified
            connector exists; everything else is clearly marked as designed for.
          </p>
        </div>
        <div className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {ecosystem.map(([name, description, integrated]) => (
            <Card key={name} className="p-5">
              <div className="flex items-start justify-between gap-3">
                <h3 className="font-medium">{name}</h3>
                <StatusBadge tone={integrated ? 'positive' : 'neutral'}>
                  {integrated ? 'Integrated' : 'Designed for'}
                </StatusBadge>
              </div>
              <p className="mt-8 text-sm leading-6 text-[hsl(var(--muted))]">{description}</p>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

export function FinalCta() {
  return (
    <section className="px-5 py-24 sm:px-8 sm:py-32">
      <div className="relative mx-auto max-w-7xl overflow-hidden rounded-2xl border border-[hsl(var(--accent))]/25 bg-[radial-gradient(circle_at_75%_20%,hsl(var(--accent))/0.16,transparent_32%),hsl(var(--surface-1))] p-8 sm:p-14">
        <div className="relative max-w-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
            A clearer vantage point
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            Your capital. One command center.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted))]">
            Start with the wallet you already control and bring the full Stellar financial picture
            into focus.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-md bg-[hsl(var(--accent))] px-5 text-sm font-semibold text-[hsl(var(--background))] hover:brightness-110"
            >
              Launch App →
            </Link>
            <Link
              href="/dashboard"
              className="inline-flex h-11 items-center justify-center rounded-md border border-white/10 bg-white/[0.05] px-5 text-sm font-medium hover:bg-white/[0.09]"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
