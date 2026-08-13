'use client';

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { GlassPanel, StatusBadge } from '../ui/design-system';

type GraphNode = {
  id: string;
  label: string;
  group: string;
  detail: string;
  actions: string;
  position: string;
  tone: 'accent' | 'positive' | 'info' | 'warning';
};

const nodes: GraphNode[] = [
  {
    id: 'wallet',
    label: 'Wallet',
    group: 'Control',
    detail: 'Your connected wallet remains the signing authority.',
    actions: 'Connect · Sign',
    position: 'left-[3%] top-[42%]',
    tone: 'accent',
  },
  {
    id: 'xlm',
    label: 'XLM',
    group: 'Native asset',
    detail: 'The network asset for balances, fees, and movement.',
    actions: 'Hold · Pay',
    position: 'left-[22%] top-[15%]',
    tone: 'accent',
  },
  {
    id: 'stablecoins',
    label: 'Stablecoins',
    group: 'Digital cash',
    detail: 'Track stable-value assets beside the rest of your portfolio.',
    actions: 'Hold · Pay · Swap',
    position: 'left-[22%] top-[70%]',
    tone: 'positive',
  },
  {
    id: 'rwas',
    label: 'RWAs',
    group: 'Tokenized assets',
    detail: 'Discover funds, treasury exposure, and cash products with source-aware context.',
    actions: 'Hold · Earn · Verify collateral',
    position: 'left-[43%] top-[8%]',
    tone: 'warning',
  },
  {
    id: 'blend',
    label: 'Blend',
    group: 'Lending market',
    detail: 'See supply and borrow positions in one normalized view.',
    actions: 'Supply · Borrow',
    position: 'left-[43%] top-[68%]',
    tone: 'info',
  },
  {
    id: 'aquarius',
    label: 'Aquarius',
    group: 'Liquidity venue',
    detail: 'Understand swaps and liquidity exposure across the portfolio.',
    actions: 'Swap · Liquidity',
    position: 'left-[67%] top-[8%]',
    tone: 'positive',
  },
  {
    id: 'sushi',
    label: 'Sushi',
    group: 'Liquidity venue',
    detail: 'Surface concentrated liquidity positions and their exposure.',
    actions: 'Concentrated liquidity',
    position: 'left-[67%] top-[68%]',
    tone: 'accent',
  },
  {
    id: 'templar',
    label: 'Templar',
    group: 'Lending market',
    detail: 'Keep collateral and borrowing context next to other liabilities.',
    actions: 'Collateral · Borrowing',
    position: 'right-[2%] top-[18%]',
    tone: 'warning',
  },
  {
    id: 'payments',
    label: 'Payments',
    group: 'Money movement',
    detail: 'Follow payment activity from source wallet to destination.',
    actions: 'Send · Receive',
    position: 'right-[2%] top-[47%]',
    tone: 'info',
  },
  {
    id: 'cross-chain',
    label: 'Cross-chain',
    group: 'Destinations',
    detail: 'Monitor transfers leaving Stellar and their destination status.',
    actions: 'Bridge · Track',
    position: 'right-[2%] top-[76%]',
    tone: 'positive',
  },
];

const paths = [
  'M 105 220 C 190 220 185 82 280 82',
  'M 105 220 C 200 220 195 358 280 358',
  'M 280 82 C 380 82 355 120 445 120',
  'M 280 358 C 380 358 355 340 445 340',
  'M 445 120 C 540 120 535 82 665 82',
  'M 445 340 C 540 340 535 358 665 358',
  'M 665 82 C 760 82 750 160 890 160',
  'M 665 220 C 760 220 750 220 890 220',
  'M 665 358 C 760 358 750 330 890 330',
];

export function CapitalGraph() {
  const [selectedId, setSelectedId] = useState('wallet');
  const selected: GraphNode = nodes.find((node) => node.id === selectedId) ?? nodes[0]!;

  return (
    <section
      id="capital-graph"
      className="relative overflow-hidden border-y border-white/[0.06] bg-[hsl(var(--surface-1))] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_52%_45%,hsl(var(--accent))/0.08,transparent_42%)]" />
      <div className="relative mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="text-xs uppercase tracking-[0.16em] text-[hsl(var(--accent))]">
            The capital graph
          </p>
          <h2 className="mt-4 text-4xl font-semibold tracking-tight sm:text-6xl">
            See where capital can move.
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[hsl(var(--muted))]">
            Follow the relationships between your wallet, assets, protocols, payments, and
            destinations from one calm operating surface.
          </p>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-[1fr_280px] lg:items-center">
          <div
            className="relative hidden aspect-[1.8/1] overflow-hidden rounded-2xl border border-white/[0.08] bg-black/10 lg:block"
            aria-label="Interactive capital graph"
          >
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 1000 440"
              fill="none"
              aria-hidden="true"
            >
              <defs>
                <linearGradient id="capital-flow" x1="0" x2="1">
                  <stop stopColor="hsl(var(--accent))" stopOpacity=".15" />
                  <stop offset=".5" stopColor="hsl(var(--accent))" stopOpacity=".85" />
                  <stop offset="1" stopColor="hsl(var(--positive))" stopOpacity=".2" />
                </linearGradient>
              </defs>
              {paths.map((path, index) => (
                <path
                  key={path}
                  d={path}
                  className={cn('capital-flow', index % 2 === 1 && 'capital-flow-delay')}
                  stroke="url(#capital-flow)"
                />
              ))}
              <circle cx="500" cy="220" r="92" stroke="hsl(var(--accent))" strokeOpacity=".08" />
              <circle
                cx="500"
                cy="220"
                r="56"
                stroke="hsl(var(--accent))"
                strokeOpacity=".15"
                strokeDasharray="2 8"
              />
            </svg>
            <div className="absolute left-1/2 top-1/2 flex h-28 w-28 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-[hsl(var(--accent))]/45 bg-[hsl(var(--accent))]/10 text-center shadow-[0_0_80px_hsl(var(--accent))/0.16)]">
              <span>
                <strong className="block text-2xl text-[hsl(var(--accent))]">S</strong>
                <span className="text-[10px] uppercase tracking-[0.14em]">Financial OS</span>
              </span>
            </div>
            {nodes.map((node) => (
              <button
                key={node.id}
                type="button"
                aria-pressed={selectedId === node.id}
                onClick={() => setSelectedId(node.id)}
                className={cn(
                  'absolute z-10 -translate-y-1/2 rounded-lg border px-3 py-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]',
                  node.position,
                  selectedId === node.id
                    ? 'border-[hsl(var(--accent))]/60 bg-[hsl(var(--accent))]/15 shadow-[0_0_30px_hsl(var(--accent))/0.13)]'
                    : 'border-white/[0.1] bg-[hsl(var(--surface-2))]/90 hover:border-white/25',
                )}
              >
                <span className="block text-xs font-medium">{node.label}</span>
                <span className="mt-1 block text-[9px] uppercase tracking-[0.1em] text-[hsl(var(--muted))]">
                  {node.group}
                </span>
              </button>
            ))}
          </div>

          <GlassPanel className="p-5 sm:p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
                  Selected route
                </p>
                <h3 className="mt-2 text-2xl font-semibold">{selected.label}</h3>
              </div>
              <StatusBadge tone={selected.tone}>{selected.group}</StatusBadge>
            </div>
            <p className="mt-5 text-sm leading-6 text-[hsl(var(--muted))]">{selected.detail}</p>
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <p className="text-[10px] uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
                Relevant actions
              </p>
              <p className="mt-2 text-sm font-medium text-[hsl(var(--accent))]">
                {selected.actions}
              </p>
            </div>
            <p className="mt-6 text-xs leading-5 text-[hsl(var(--muted))]">
              Availability, terms, and protocol data are shown when verified. Transactions remain
              wallet-signed.
            </p>
          </GlassPanel>
        </div>

        <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:hidden" aria-label="Capital graph nodes">
          {nodes.map((node) => (
            <button
              key={node.id}
              type="button"
              aria-pressed={selectedId === node.id}
              onClick={() => setSelectedId(node.id)}
              className={cn(
                'rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[hsl(var(--accent))]',
                selectedId === node.id
                  ? 'border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/10'
                  : 'border-white/[0.08] bg-white/[0.025] hover:bg-white/[0.05]',
              )}
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-medium">{node.label}</span>
                <span className="text-[10px] uppercase tracking-[0.1em] text-[hsl(var(--muted))]">
                  {node.group}
                </span>
              </span>
              <span className="mt-2 block text-xs text-[hsl(var(--muted))]">{node.actions}</span>
            </button>
          ))}
        </div>

        <div className="sr-only" aria-label="Capital graph routes">
          <h3>Capital graph routes</h3>
          <ul>
            {nodes.map((node) => (
              <li key={node.id}>
                <strong>{node.label}</strong>: {node.detail} Actions: {node.actions}.
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
