'use client';

import Link from 'next/link';
import { useState } from 'react';
import { IconButton } from '../ui/design-system';

const links = [
  ['Product', '#product'],
  ['RWAs', '#rwas'],
  ['DeFi', '#defi'],
  ['Payments', '#payments'],
  ['Institutions', '#institutions'],
  ['Developers', '#developers'],
  ['Security', '#security'],
] as const;

export function MarketingHeader() {
  const [open, setOpen] = useState(false);
  const linkClass =
    'inline-flex h-9 items-center justify-center rounded-md border px-4 text-sm font-medium transition-colors';
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/[0.07] bg-[hsl(var(--background))]/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[hsl(var(--accent))] text-sm font-bold text-[hsl(var(--background))]">
            S
          </span>
          <span className="text-sm font-semibold tracking-tight">
            Stellar <span className="text-[hsl(var(--accent))]">OS</span>
          </span>
        </Link>
        <nav className="hidden items-center gap-6 lg:flex">
          {links.map(([label, href]) => (
            <a
              key={href}
              href={href}
              className="text-xs text-[hsl(var(--muted))] transition-colors hover:text-foreground"
            >
              {label}
            </a>
          ))}
        </nav>
        <div className="hidden items-center gap-2 sm:flex">
          <Link
            className={`${linkClass} border-transparent text-[hsl(var(--muted))] hover:bg-white/[0.06] hover:text-foreground`}
            href="/dashboard"
          >
            Launch App
          </Link>
          <Link
            className={`${linkClass} border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--background))] hover:brightness-110`}
            href="/dashboard"
          >
            Connect Wallet
          </Link>
        </div>
        <IconButton
          label="Open marketing navigation"
          onClick={() => setOpen(true)}
          className="sm:hidden"
        >
          ☰
        </IconButton>
      </div>
      {open && (
        <div className="border-t border-white/[0.07] bg-[hsl(var(--surface-1))] p-5 sm:hidden">
          <div className="mb-4 flex justify-end">
            <IconButton label="Close marketing navigation" onClick={() => setOpen(false)}>
              ×
            </IconButton>
          </div>
          <nav className="grid gap-1">
            {links.map(([label, href]) => (
              <a
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="rounded-md px-3 py-3 text-sm text-[hsl(var(--muted))] hover:bg-white/[0.05] hover:text-foreground"
              >
                {label}
              </a>
            ))}
          </nav>
          <div className="mt-5 grid gap-2">
            <Link className={`${linkClass} border-white/10 bg-white/[0.06]`} href="/dashboard">
              Launch App
            </Link>
            <Link
              className={`${linkClass} border-transparent bg-[hsl(var(--accent))] text-[hsl(var(--background))]`}
              href="/dashboard"
            >
              Connect Wallet
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}
