'use client';

import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  SectionHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { ConnectWalletButton } from '../../components/wallet/connect-wallet-button';
import { clientEnv } from '../../lib/config/env';
import { useSession } from '../../lib/session/context';
import { useWallet } from '../../lib/wallet/context';
import { TransactionComposer } from '../transactions/transaction-composer';
import { type AssetIdentity, swapApi, type UnifiedQuote } from './swap-api';

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
function assetLabel(asset: AssetIdentity) {
  return asset.type === 'native'
    ? 'XLM'
    : asset.type === 'classic'
      ? `${asset.assetCode ?? 'Asset'} · ${asset.issuerAddress ?? 'issuer unknown'}`
      : (asset.contractAddress ?? 'Contract asset');
}
function short(value: string) {
  return value.length > 18 ? `${value.slice(0, 8)}…${value.slice(-6)}` : value;
}

export function SwapPage() {
  const { session } = useSession();
  const { address, network: walletNetwork } = useWallet();
  const network = (walletNetwork ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK) as
    'mainnet' | 'testnet';
  const [input, setInput] = useState('native');
  const [output, setOutput] = useState('');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('50');
  const [selected, setSelected] = useState<UnifiedQuote | null>(null);
  const quote = useMutation({ mutationFn: swapApi.quotes });
  const request = () => {
    const tokenIn = parseAsset(input, network);
    const tokenOut = parseAsset(output, network);
    if (!tokenIn || !tokenOut || !amount) return;
    setSelected(null);
    quote.mutate({ network, tokenIn, tokenOut, amountIn: amount, slippageBps: slippage });
  };
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to swap"
        description="Swaps are prepared, simulated, and signed only by your connected wallet. Financial OS never requests a seed phrase."
        action={<ConnectWalletButton />}
      />
    );
  const displayed = quote.data?.quotes ?? [];
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Execution"
        title="Swap"
        description="Compare fresh routes, inspect price impact, then send the selected route through the central transaction composer."
        actions={<StatusBadge tone="info">{network}</StatusBadge>}
      />
      <Card className="grid gap-4 p-5 md:grid-cols-[1fr_auto_1fr] md:items-end">
        <AssetField
          label="From"
          value={input}
          placeholder="native or classic:CODE:G…"
          onChange={setInput}
        />
        <div className="pb-2 text-center text-xl text-[hsl(var(--muted))]">→</div>
        <AssetField label="To" value={output} placeholder="contract:C…" onChange={setOutput} />
        <label className="text-xs text-[hsl(var(--muted))]">
          Amount
          <input
            className="mt-2 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
            inputMode="decimal"
            value={amount}
            onChange={(event) =>
              setAmount((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="0.00"
          />
        </label>
        <label className="text-xs text-[hsl(var(--muted))]">
          Slippage (bps)
          <input
            className="mt-2 w-full rounded-md border border-white/[0.1] bg-white/[0.04] px-3 py-2 text-sm text-white"
            inputMode="numeric"
            value={slippage}
            onChange={(event) =>
              setSlippage((event.currentTarget as unknown as { value: string }).value)
            }
          />
        </label>
        <button
          className="rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          disabled={
            quote.isPending ||
            !parseAsset(input, network) ||
            !parseAsset(output, network) ||
            !amount
          }
          onClick={request}
        >
          {quote.isPending ? 'Refreshing…' : 'Get fresh quotes'}
        </button>
      </Card>
      {quote.error ? (
        <ErrorState
          title="Quote unavailable"
          description={
            quote.error instanceof Error
              ? quote.error.message
              : 'No route providers returned a quote.'
          }
          action={
            <button
              className="rounded-md border border-white/10 px-3 py-2 text-sm"
              onClick={request}
            >
              Retry
            </button>
          }
        />
      ) : null}
      {quote.isPending ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      ) : null}
      {quote.data ? (
        <section className="space-y-3">
          <SectionHeader
            title="Fresh routes"
            description="Recommendation balances output, fee information, price impact, provider risk, and freshness."
          />
          {displayed.length ? (
            <div className="grid gap-4 lg:grid-cols-2">
              {displayed.map((item) => (
                <QuoteCard
                  item={item}
                  recommended={
                    quote.data?.recommended?.provider === item.provider &&
                    quote.data?.recommended?.expiration === item.expiration
                  }
                  selected={selected?.provider === item.provider}
                  onSelect={() => setSelected(item)}
                  key={`${item.provider}-${item.expiration}`}
                />
              ))}
            </div>
          ) : (
            <Card className="p-6">
              <EmptyState
                title="Insufficient liquidity"
                description="No configured provider returned a usable route for this pair and amount."
              />
            </Card>
          )}
        </section>
      ) : null}
      {selected ? (
        <section className="space-y-3">
          <SectionHeader
            title="Execute selected route"
            description="The central composer fetches current protocol state and simulates again before wallet approval."
          />
          <TransactionComposer
            request={{
              account: address,
              protocol: selected.provider,
              action: 'swap',
              network,
              asset: selected.inputAsset,
              quoteAsset: selected.outputAsset,
              amount: selected.inputAmount,
              minReceived: selected.minimumReceived,
              slippageBps: slippage,
              quoteExpiresAt: selected.expiration,
            }}
          />
        </section>
      ) : null}
    </div>
  );
}
function AssetField({
  label,
  value,
  placeholder,
  onChange,
}: {
  label: string;
  value: string;
  placeholder: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="text-xs text-[hsl(var(--muted))]">
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
function QuoteCard({
  item,
  recommended,
  selected,
  onSelect,
}: {
  item: UnifiedQuote;
  recommended: boolean;
  selected: boolean;
  onSelect: () => void;
}) {
  const expired = item.stale || Date.now() >= new Date(item.expiration).getTime();
  return (
    <Card className={`p-5 ${selected ? 'border-[hsl(var(--accent))]' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.12em] text-[hsl(var(--muted))]">
            {item.provider}
          </p>
          <h3 className="mt-1 text-lg font-medium">
            {item.expectedOutput} {assetLabel(item.outputAsset)}
          </h3>
        </div>
        <div className="flex gap-2">
          {recommended ? <StatusBadge tone="positive">Recommended</StatusBadge> : null}
          <StatusBadge
            tone={
              item.risk === 'high' ? 'negative' : item.risk === 'unknown' ? 'warning' : 'neutral'
            }
          >
            {item.risk} risk
          </StatusBadge>
        </div>
      </div>
      <div className="mt-5 grid grid-cols-2 gap-3 text-sm sm:grid-cols-4">
        <Stat label="Minimum received" value={item.minimumReceived} />
        <Stat label="Exchange rate" value={item.exchangeRate} />
        <Stat
          label="Price impact"
          value={item.priceImpact == null ? 'Unknown' : item.priceImpact}
        />
        <Stat label="Fees" value={item.networkFee ?? item.protocolFees ?? 'Unknown'} />
      </div>
      <div className="mt-5 flex flex-wrap items-center gap-2 text-xs text-[hsl(var(--muted))]">
        <span>Route:</span>
        {item.route.length ? (
          item.route.map((hop, index) => (
            <span key={`${hop}-${index}`}>
              <span className="rounded bg-white/[0.06] px-2 py-1">{short(hop)}</span>
              {index < item.route.length - 1 ? ' → ' : ''}
            </span>
          ))
        ) : (
          <span>Unavailable</span>
        )}
      </div>
      {item.warnings.map((warning) => (
        <p className="mt-3 text-xs text-amber-200" key={warning}>
          {warning}
        </p>
      ))}
      <button
        disabled={expired}
        className="mt-5 w-full rounded-md border border-white/10 px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        onClick={onSelect}
      >
        {expired ? 'Quote expired — refresh' : selected ? 'Selected route' : 'Select route'}
      </button>
    </Card>
  );
}
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 break-words tabular-nums">{value}</p>
    </div>
  );
}
