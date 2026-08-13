import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AppProviders } from '../components/providers';

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://stellarfinancialos.com'),
  title: {
    default: 'Stellar Financial OS | One command center for Stellar',
    template: '%s | Stellar Financial OS',
  },
  description:
    'A non-custodial financial command center for Stellar assets, RWAs, DeFi, payments, yield, and cross-chain activity.',
  applicationName: 'Stellar Financial OS',
  keywords: ['Stellar', 'XLM', 'real-world assets', 'DeFi', 'financial command center'],
  alternates: { canonical: '/' },
  openGraph: {
    type: 'website',
    siteName: 'Stellar Financial OS',
    title: 'Your financial life on Stellar. One command center.',
    description:
      'Track assets, RWAs, DeFi positions, yields, payments, and cross-chain activity from one non-custodial interface.',
    url: '/',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Your financial life on Stellar. One command center.',
    description: 'A non-custodial operating surface for the Stellar financial stack.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
