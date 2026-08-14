'use client';

import { useMemo, useState } from 'react';
import { Card, EmptyState, PageHeader, StatusBadge } from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';

export function ReceivePaymentPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const uri = useMemo(() => {
    if (!address) return '';
    const params = new URLSearchParams({ destination: address });
    if (amount) params.set('amount', amount);
    if (memo) params.set('memo', memo);
    return `web+stellar:pay?${params.toString()}`;
  }, [address, amount, memo]);
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to receive"
        description="Your wallet address and receive link appear after connection. Financial OS never requests a seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Payments"
        title="Receive"
        description="Share your public Stellar address or an interoperable SEP-0007 payment link. Never share a secret key."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="grid gap-6 p-6 lg:grid-cols-[1fr_.8fr]">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
            Public address
          </p>
          <p className="mt-3 break-all font-mono text-sm">{address}</p>
          <button
            className="mt-4 rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() =>
              void (
                navigator as unknown as {
                  clipboard?: { writeText: (text: string) => Promise<void> };
                }
              ).clipboard?.writeText(address)
            }
          >
            Copy address
          </button>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <Field label="Suggested amount (optional)" value={amount} onChange={setAmount} />
            <Field label="Memo (optional)" value={memo} onChange={setMemo} />
          </div>
        </div>
        <div className="rounded-xl border border-white/[0.08] bg-white/[0.03] p-5">
          <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
            Payment deep link
          </p>
          <p className="mt-3 break-all text-xs text-[hsl(var(--muted))]">{uri}</p>
          <a
            className="mt-4 inline-block rounded-md bg-[hsl(var(--accent))] px-3 py-2 text-sm font-medium text-black"
            href={uri}
          >
            Open in wallet
          </a>
          <p className="mt-4 text-xs leading-5 text-[hsl(var(--muted))]">
            This uses the Stellar `web+stellar:pay` URI format. QR rendering is intentionally not
            substituted with an unverified third-party generator; the deep link can be copied into a
            trusted QR tool or wallet.
          </p>
        </div>
      </Card>
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-[hsl(var(--muted))]">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
        value={value}
        onChange={(event) => onChange((event.currentTarget as unknown as { value: string }).value)}
      />
    </label>
  );
}
