import Link from 'next/link';

const footerGroups = [
  [
    'Explore',
    [
      ['Product', '#product'],
      ['RWAs', '#rwas'],
      ['DeFi', '#defi'],
      ['Payments', '#payments'],
    ],
  ],
  [
    'Build',
    [
      ['Developers', '#developers'],
      ['Security', '#security'],
      ['Documentation', '#documentation'],
    ],
  ],
  [
    'Company',
    [
      ['Institutions', '#institutions'],
      ['Terms', '#terms'],
      ['Privacy', '#privacy'],
    ],
  ],
] as const;

export function MarketingFooter() {
  const githubUrl = process.env.NEXT_PUBLIC_GITHUB_URL;
  return (
    <footer className="border-t border-white/[0.08] bg-[hsl(var(--surface-1))]">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 sm:px-8 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="text-sm font-semibold">
            Stellar <span className="text-[hsl(var(--accent))]">OS</span>
          </Link>
          <p className="mt-4 max-w-xs text-sm leading-6 text-[hsl(var(--muted))]">
            Your financial life on Stellar. One command center.
          </p>
          <p className="mt-5 max-w-xs text-xs leading-5 text-[hsl(var(--muted))]">
            Non-custodial by design. Financial OS never requests, stores, or handles private keys.
          </p>
        </div>
        {footerGroups.map(([title, items]) => (
          <div key={title}>
            <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
              {title}
            </h2>
            <div className="mt-4 grid gap-3">
              {items.map(([item, href]) => (
                <a
                  key={item}
                  href={href}
                  className="text-sm text-[hsl(var(--muted))] transition-colors hover:text-foreground"
                >
                  {item}
                </a>
              ))}
            </div>
          </div>
        ))}
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
            Connect
          </h2>
          <div className="mt-4 grid gap-3">
            {githubUrl ? (
              <a
                href={githubUrl}
                rel="noreferrer"
                target="_blank"
                className="text-sm text-[hsl(var(--muted))] transition-colors hover:text-foreground"
              >
                GitHub
              </a>
            ) : null}
            <a
              href="#documentation"
              className="text-sm text-[hsl(var(--muted))] transition-colors hover:text-foreground"
            >
              Documentation placeholder
            </a>
          </div>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-col gap-2 border-t border-white/[0.06] px-5 py-5 text-xs text-[hsl(var(--muted))] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>© 2026 Stellar Financial OS</span>
        <span>Network-aware. Wallet-owned. Source-conscious.</span>
      </div>
    </footer>
  );
}
