'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, type ReactNode } from 'react';
import { cn } from '../../lib/utils';
import { ConnectWalletButton } from '../wallet/connect-wallet-button';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { Button, IconButton, NetworkBadge, SearchInput } from '../ui/design-system';

const sections = [
  { label: 'Overview', items: [['Dashboard', '/dashboard', '⌂']] },
  {
    label: 'DeFi',
    items: [
      ['Portfolio', '/dashboard/portfolio', '◫'],
      ['Assets', '/dashboard/assets', '◈'],
      ['RWAs', '/dashboard/rwas', '▱'],
      ['Markets', '/dashboard/markets', '⌁'],
      ['Yield', '/dashboard/yield', '↗'],
      ['Risk', '/dashboard/risk', '⊙'],
      ['Swap', '/dashboard/swap', '⇄'],
    ],
  },
  {
    label: 'Payments',
    items: [
      ['Activity', '/dashboard/activity', '◷'],
      ['Cross-chain', '/dashboard/cross-chain', '⇆'],
    ],
  },
  {
    label: 'Workspace',
    items: [
      ['Watchlist', '/dashboard/watchlist', '☆'],
      ['Alerts', '/dashboard/alerts', '◌'],
    ],
  },
  { label: 'Institutional', items: [['Settings', '/dashboard/settings', '⚙']] },
] as const;

function Sidebar({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
  const pathname = usePathname();
  return (
    <aside
      className={cn(
        'hidden shrink-0 border-r border-white/[0.08] bg-[hsl(var(--surface-1))] transition-[width] duration-200 lg:flex lg:flex-col',
        collapsed ? 'w-[76px]' : 'w-60',
      )}
    >
      <div className="flex h-16 items-center justify-between border-b border-white/[0.08] px-4">
        <Link href="/dashboard" className="flex items-center gap-3 overflow-hidden">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--background))]">
            S
          </span>
          {!collapsed && (
            <span className="whitespace-nowrap text-sm font-semibold tracking-tight">
              Stellar <span className="text-[hsl(var(--accent))]">OS</span>
            </span>
          )}
        </Link>
        <IconButton
          label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          onClick={onToggle}
          className="border-0 bg-transparent"
        >
          {collapsed ? '›' : '‹'}
        </IconButton>
      </div>
      <nav className="flex-1 space-y-6 overflow-y-auto px-3 py-5">
        {sections.map((section) => (
          <div key={section.label}>
            <p
              className={cn(
                'mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--muted))]',
                collapsed && 'text-center text-[8px]',
              )}
            >
              {collapsed ? section.label.slice(0, 2) : section.label}
            </p>
            <div className="space-y-1">
              {section.items.map(([label, href, icon]) => (
                <Link
                  key={href}
                  href={href}
                  title={collapsed ? label : undefined}
                  className={cn(
                    'flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors',
                    pathname === href
                      ? 'bg-[hsl(var(--accent))]/10 text-[hsl(var(--accent))]'
                      : 'text-[hsl(var(--muted))] hover:bg-white/[0.05] hover:text-foreground',
                    collapsed && 'justify-center px-0',
                  )}
                >
                  <span className="w-4 text-center text-base">{icon}</span>
                  {!collapsed && <span>{label}</span>}
                </Link>
              ))}
            </div>
          </div>
        ))}
      </nav>
      <div className="border-t border-white/[0.08] p-3">
        <div className={cn('rounded-lg bg-white/[0.04] p-3', collapsed && 'p-2')}>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[hsl(var(--positive))]" />
            {!collapsed && (
              <span className="text-xs text-[hsl(var(--muted))]">Systems operational</span>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}

function MobileNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 lg:hidden" onClick={onClose}>
      <div
        className="absolute inset-y-0 left-0 w-72 border-r border-white/[0.08] bg-[hsl(var(--surface-1))] p-4 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-between">
          <span className="font-semibold">
            Stellar <span className="text-[hsl(var(--accent))]">OS</span>
          </span>
          <IconButton label="Close navigation" onClick={onClose}>
            ×
          </IconButton>
        </div>
        <nav className="space-y-5">
          {sections.map((section) => (
            <div key={section.label}>
              <p className="mb-2 px-2 text-[10px] uppercase tracking-[0.16em] text-[hsl(var(--muted))]">
                {section.label}
              </p>
              {section.items.map(([label, href, icon]) => (
                <Link
                  onClick={onClose}
                  key={href}
                  href={href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-[hsl(var(--muted))] hover:bg-white/[0.05] hover:text-foreground"
                >
                  <span>{icon}</span>
                  {label}
                </Link>
              ))}
            </div>
          ))}
        </nav>
      </div>
    </div>
  );
}

function Topbar({ onMenu }: { onMenu: () => void }) {
  const { address } = useWallet();
  const { session } = useSession();
  return (
    <header className="flex h-16 items-center gap-3 border-b border-white/[0.08] bg-[hsl(var(--background))]/90 px-4 backdrop-blur-xl sm:px-6">
      <IconButton label="Open navigation" onClick={onMenu} className="lg:hidden">
        ☰
      </IconButton>
      <div className="hidden min-w-0 flex-1 sm:block">
        <SearchInput
          placeholder="Search accounts, assets, protocols…  ⌘K"
          className="max-w-md border-white/[0.08] bg-white/[0.03]"
        />
      </div>
      <div className="ml-auto flex items-center gap-2">
        <NetworkBadge network={session?.network === 'mainnet' ? 'mainnet' : 'testnet'} />
        {address ? (
          <Button
            size="sm"
            variant="secondary"
            className="hidden sm:inline-flex"
          >{`${address.slice(0, 5)}…${address.slice(-4)}`}</Button>
        ) : (
          <span className="hidden sm:inline-flex">
            <ConnectWalletButton compact />
          </span>
        )}
        <IconButton label="Notifications">♢</IconButton>
        <IconButton label="Account menu">{address?.slice(0, 1) ?? '○'}</IconButton>
      </div>
    </header>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-[hsl(var(--background))]">
      <Sidebar collapsed={collapsed} onToggle={() => setCollapsed((value) => !value)} />
      <MobileNav open={mobileOpen} onClose={() => setMobileOpen(false)} />
      <div className="min-w-0 flex-1">
        <Topbar onMenu={() => setMobileOpen(true)} />
        <main>{children}</main>
      </div>
    </div>
  );
}
