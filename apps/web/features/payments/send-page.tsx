'use client';

import { useState } from 'react';
import {
  Card,
  EmptyState,
  PageHeader,
  SectionHeader,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { TransactionComposer } from '../transactions/transaction-composer';
import type { AssetIdentity } from '../swap/swap-api';

function parseAsset(value: string, network: 'mainnet' | 'testnet'): AssetIdentity | null {
  if (value.trim() === 'native') return { network, type: 'native' };
  const parts = value.trim().split(':');
  if (parts.length === 3 && parts[0] === 'classic')
    return {
      network,
      type: 'classic',
      assetCode: decodeURIComponent(parts[1] ?? ''),
      issuerAddress: parts[2],
    };
  if (parts.length === 2 && parts[0] === 'contract')
    return { network, type: 'contract', contractAddress: parts[1] };
  return null;
}
export function SendPaymentPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = (walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK) as
    'mainnet' | 'testnet';
  const [recipient, setRecipient] = useState('');
  const [assetText, setAssetText] = useState('native');
  const [amount, setAmount] = useState('');
  const [memo, setMemo] = useState('');
  const [mode, setMode] = useState<'direct' | 'strictSend' | 'strictReceive'>('direct');
  const [destinationAsset, setDestinationAsset] = useState('');
  const [destinationAmount, setDestinationAmount] = useState('');
  const [minimumAmount, setMinimumAmount] = useState('');
  const [review, setReview] = useState(false);
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to send"
        description="The connected wallet signs every Stellar payment. Financial OS never accepts seed phrases."
        action={<ConnectWalletButton />}
      />
    );
  const asset = parseAsset(assetText, network);
  const quoteAsset = mode === 'direct' ? null : parseAsset(destinationAsset, network);
  const valid = Boolean(
    asset &&
    recipient &&
    amount &&
    (mode === 'direct' || (quoteAsset && (destinationAmount || minimumAmount))),
  );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Payments"
        title="Send payment"
        description="Prepare, validate, simulate, review, and sign a Stellar payment from your connected wallet."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="space-y-5 p-5">
        <SectionHeader
          title="Payment details"
          description="Use `native` for XLM, `classic:CODE:ISSUER` for an issued asset, or a verified contract route through DeFi."
        />
        <Field
          label="Recipient (G… or muxed M…)"
          value={recipient}
          onChange={setRecipient}
          placeholder="G… or M…"
        />
        <Field
          label="Asset identity"
          value={assetText}
          onChange={setAssetText}
          placeholder="native or classic:USDC:G…"
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Amount" value={amount} onChange={setAmount} placeholder="0.00" />
          <Field
            label="Memo (optional)"
            value={memo}
            onChange={setMemo}
            placeholder="Up to 28 characters"
          />
        </div>
        <label className="text-xs text-[hsl(var(--muted))]">
          Payment behavior
          <select
            className="mt-2 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
            value={mode}
            onChange={(event) =>
              setMode((event.currentTarget as unknown as { value: typeof mode }).value)
            }
          >
            <option value="direct">Direct payment</option>
            <option value="strictSend">Path payment · strict send</option>
            <option value="strictReceive">Path payment · strict receive</option>
          </select>
        </label>
        {mode !== 'direct' ? (
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Destination asset"
              value={destinationAsset}
              onChange={setDestinationAsset}
              placeholder="classic:USDC:G…"
            />
            {mode === 'strictReceive' ? (
              <Field
                label="Destination amount"
                value={destinationAmount}
                onChange={setDestinationAmount}
                placeholder="0.00"
              />
            ) : (
              <Field
                label="Minimum received"
                value={minimumAmount}
                onChange={setMinimumAmount}
                placeholder="0.00"
              />
            )}
          </div>
        ) : null}
        <button
          disabled={!valid}
          className="w-full rounded-md bg-[hsl(var(--accent))] px-4 py-3 text-sm font-medium text-black disabled:opacity-50"
          onClick={() => setReview(true)}
        >
          Review payment
        </button>
      </Card>
      {review && asset ? (
        <section className="space-y-3">
          <SectionHeader
            title="Review and sign"
            description="Simulation and human-readable warnings happen before your wallet opens."
          />
          <TransactionComposer
            request={{
              account: address,
              protocol: 'stellar',
              action: 'payment',
              network,
              asset,
              quoteAsset: quoteAsset ?? undefined,
              amount,
              destination: recipient,
              memo: memo || undefined,
              pathMode: mode === 'direct' ? undefined : mode,
              destAmount: destinationAmount || undefined,
              destMin: minimumAmount || undefined,
              minReceived: minimumAmount || undefined,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="block text-xs text-[hsl(var(--muted))]">
      {label}
      <input
        className="mt-2 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
        value={value}
        placeholder={placeholder}
        onChange={(event) => onChange((event.currentTarget as unknown as { value: string }).value)}
      />
    </label>
  );
}
