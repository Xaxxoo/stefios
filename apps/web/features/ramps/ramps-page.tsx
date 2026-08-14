'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
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
import { rampsApi, type AnchorInfo, type AnchorSummary, type AnchorTransaction } from './ramps-api';

export function RampsPage() {
  const { session } = useSession();
  const { address, network, signTransaction } = useWallet();
  const searchParams = useSearchParams();
  const selectedNetwork = network ?? session?.network ?? clientEnv.NEXT_PUBLIC_STELLAR_NETWORK;
  const [domain, setDomain] = useState('');
  const [selected, setSelected] = useState<AnchorSummary | null>(null);
  const [info, setInfo] = useState<AnchorInfo | null>(null);
  const [authToken, setAuthToken] = useState<string | undefined>();
  const [kind, setKind] = useState<'deposit' | 'withdraw'>('deposit');
  const [asset, setAsset] = useState('');
  const [amount, setAmount] = useState('');
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof rampsApi.quote>> | null>(null);
  const [flow, setFlow] = useState<AnchorTransaction | null>(null);
  const [returnedLocalId, setReturnedLocalId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const client = useQueryClient();
  const anchors = useQuery({
    queryKey: ['anchors', selectedNetwork],
    queryFn: () => rampsApi.list(selectedNetwork),
    staleTime: 5 * 60_000,
  });
  const history = useQuery({
    queryKey: ['anchor-transactions', selectedNetwork],
    queryFn: () => rampsApi.history(selectedNetwork),
    enabled: Boolean(session),
    refetchInterval: 15_000,
  });
  const discovery = useMutation({
    mutationFn: () => rampsApi.discover(domain, selectedNetwork),
    onSuccess: (result) => {
      setSelected(result);
      setDomain('');
      void client.invalidateQueries({ queryKey: ['anchors', selectedNetwork] });
    },
  });
  const selectedDetails = useQuery({
    queryKey: ['anchor', selected?.slug, selectedNetwork],
    queryFn: () => rampsApi.get(selected?.slug ?? '', selectedNetwork),
    enabled: Boolean(selected),
    staleTime: 5 * 60_000,
  });
  useEffect(() => {
    if (selectedDetails.data) {
      setInfo(selectedDetails.data);
      setAsset((current) => current || selectedDetails.data.assets[0]?.code || '');
    }
  }, [selectedDetails.data]);
  const selectedAsset = useMemo(
    () => info?.assets.find((item) => item.code === asset) ?? null,
    [asset, info?.assets],
  );
  const transaction = useQuery({
    queryKey: ['anchor-transaction', flow?.localId ?? returnedLocalId],
    queryFn: () => rampsApi.transaction((flow?.localId ?? returnedLocalId) as string),
    enabled: Boolean(flow?.localId ?? returnedLocalId),
    refetchInterval: (current) =>
      current.state.data?.state === 'completed' || current.state.data?.state === 'failed'
        ? false
        : 10_000,
  });
  useEffect(() => {
    const queryId =
      searchParams.get('transaction') ?? searchParams.get('id') ?? searchParams.get('localId');
    const storage = globalThis as typeof globalThis & { localStorage?: Storage };
    const stored = storage.localStorage?.getItem('sfo_anchor_return');
    let storedId: { localId?: string } | null = null;
    try {
      storedId = stored ? (JSON.parse(stored) as { localId?: string }) : null;
    } catch {
      storage.localStorage?.removeItem('sfo_anchor_return');
    }
    const localId = queryId ?? storedId?.localId ?? null;
    if (localId) {
      setReturnedLocalId(localId);
      storage.localStorage?.removeItem('sfo_anchor_return');
    }
  }, [searchParams]);
  const authenticate = async () => {
    if (!selected || !address) return;
    setMessage(null);
    const challenge = await rampsApi.authChallenge(selected.slug, selectedNetwork, address);
    const signed = await signTransaction(challenge.transaction);
    const result = await rampsApi.authVerify(selected.slug, selectedNetwork, signed);
    setAuthToken(result.token);
    setMessage('Anchor authentication completed for this session.');
  };
  const getQuote = async () => {
    if (!selected || !asset || !amount) return;
    setQuote(
      await rampsApi.quote(selected.slug, selectedNetwork, {
        kind,
        sellAsset: kind === 'deposit' ? `iso4217:${asset}` : `stellar:${asset}`,
        buyAsset: kind === 'deposit' ? `stellar:${asset}` : `iso4217:${asset}`,
        ...(kind === 'deposit' ? { sellAmount: amount } : { buyAmount: amount }),
      }),
    );
  };
  const start = async () => {
    if (!selected || !address || !asset) return;
    setMessage(null);
    const result = await rampsApi.start(selected.slug, selectedNetwork, {
      kind,
      asset,
      amount: amount || undefined,
      account: address,
      authToken,
      quoteId: quote?.id ?? undefined,
    });
    setFlow(result);
    const storage = globalThis as typeof globalThis & { localStorage?: Storage };
    storage.localStorage?.setItem(
      'sfo_anchor_return',
      JSON.stringify({
        localId: result.localId,
        anchor: result.anchor,
        createdAt: new Date().toISOString(),
      }),
    );
    void client.invalidateQueries({ queryKey: ['anchor-transactions', selectedNetwork] });
    if (result.interactiveUrl)
      (
        globalThis as typeof globalThis & { location?: { assign: (url: string) => void } }
      ).location?.assign(result.interactiveUrl);
  };
  if (!session || !address)
    return (
      <EmptyState
        title="Connect your wallet to use ramps"
        description="Anchor-hosted KYC and payment flows remain with the anchor. Financial OS never collects seed phrases or sensitive documents."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Money movement"
        title="Anchors & ramps"
        description="Discover Stellar anchors, compare supported rails, and continue hosted deposit or withdrawal flows without handing documents to Financial OS."
        actions={<StatusBadge tone="info">{selectedNetwork}</StatusBadge>}
      />
      <Card className="space-y-4 p-5">
        <SectionHeader
          title="Discover an anchor"
          description="Discovery reads the anchor's advertised SEP-1 stellar.toml. Verify the domain before continuing."
        />
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={domain}
            onChange={(event) =>
              setDomain((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="anchor.example"
          />
          <button
            className="rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={!domain || discovery.isPending}
            onClick={() => discovery.mutate()}
          >
            {discovery.isPending ? 'Discovering…' : 'Discover'}
          </button>
        </div>
        {discovery.error ? (
          <p className="text-sm text-rose-200">
            {discovery.error instanceof Error ? discovery.error.message : 'Discovery failed'}
          </p>
        ) : null}
      </Card>
      <div className="grid gap-5 lg:grid-cols-[.8fr_1.2fr]">
        <Card className="p-5">
          <SectionHeader
            title="Available anchors"
            description="Only standards advertised by each anchor are shown."
          />
          {anchors.isLoading ? (
            <Skeleton className="mt-5 h-48" />
          ) : anchors.error ? (
            <ErrorState
              title="Anchors unavailable"
              description="The directory could not be loaded."
              action={
                <button
                  className="rounded-md border border-white/10 px-3 py-2 text-sm"
                  onClick={() => void anchors.refetch()}
                >
                  Retry
                </button>
              }
            />
          ) : anchors.data?.length ? (
            <div className="mt-5 space-y-2">
              {anchors.data.map((anchor) => (
                <button
                  key={`${anchor.network}-${anchor.slug}`}
                  className={`w-full rounded-lg border p-3 text-left ${selected?.slug === anchor.slug ? 'border-[hsl(var(--accent))]/50 bg-[hsl(var(--accent))]/10' : 'border-white/[0.08] bg-white/[0.03]'}`}
                  onClick={() => {
                    setSelected(anchor);
                    setInfo(null);
                    setAuthToken(undefined);
                    setQuote(null);
                  }}
                >
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{anchor.name}</span>
                    <span className="text-xs text-[hsl(var(--muted))]">
                      {anchor.assetCount} assets
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[hsl(var(--muted))]">{anchor.domain}</p>
                  <div className="mt-2 flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))]">
                    {anchor.protocols.map((protocol) => (
                      <span key={protocol}>{protocol}</span>
                    ))}
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <EmptyState
              title="No discovered anchors"
              description="Enter an anchor domain above to inspect its advertised standards."
            />
          )}
        </Card>
        <Card className="space-y-6 p-5">
          {!selected ? (
            <EmptyState
              title="Select an anchor"
              description="Its supported assets, authentication, quotes, and hosted actions will appear here."
            />
          ) : selectedDetails.isLoading ? (
            <Skeleton className="h-72" />
          ) : selectedDetails.error || !info ? (
            <ErrorState
              title="Anchor details unavailable"
              description="The anchor's current SEP-1 metadata could not be loaded."
            />
          ) : (
            <>
              <SectionHeader
                title={info.name}
                description={info.description ?? `${info.domain} · source: SEP-1`}
              />
              <div className="grid gap-3 sm:grid-cols-3">
                <Metric label="Standards" value={info.protocols.join(' · ') || 'None advertised'} />
                <Metric
                  label="Authentication"
                  value={info.authenticationRequired ? 'SEP-10 required' : 'Not advertised'}
                />
                <Metric label="KYC" value={info.kycServer ? 'Anchor-hosted' : 'Unknown'} />
              </div>
              {info.authenticationRequired ? (
                <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm">
                  <p className="font-medium text-amber-100">Anchor authentication</p>
                  <p className="mt-1 text-[hsl(var(--muted))]">
                    Your wallet signs the anchor's SEP-10 challenge. Financial OS does not receive a
                    secret key.
                  </p>
                  <button
                    className="mt-3 rounded-md border border-white/10 px-3 py-2 text-sm"
                    onClick={() => void authenticate()}
                  >
                    {authToken ? 'Authenticated for this session' : 'Authenticate with anchor'}
                  </button>
                </div>
              ) : null}
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-[hsl(var(--muted))]">
                  Flow
                  <select
                    className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                    value={kind}
                    onChange={(event) => {
                      setKind((event.currentTarget as unknown as { value: typeof kind }).value);
                      setQuote(null);
                    }}
                  >
                    <option value="deposit">Deposit to Stellar</option>
                    <option value="withdraw">Withdraw from Stellar</option>
                  </select>
                </label>
                <label className="text-xs text-[hsl(var(--muted))]">
                  Asset
                  <select
                    className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                    value={asset}
                    onChange={(event) => {
                      setAsset((event.currentTarget as unknown as { value: string }).value);
                      setQuote(null);
                    }}
                  >
                    {info.assets.map((item) => (
                      <option key={`${item.asset}-${item.code}`} value={item.code}>
                        {item.code} · {item.type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <label className="text-xs text-[hsl(var(--muted))]">
                  Amount
                  <input
                    className="mt-2 w-full rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
                    value={amount}
                    onChange={(event) => {
                      setAmount((event.currentTarget as unknown as { value: string }).value);
                      setQuote(null);
                    }}
                    placeholder="Optional until anchor requires it"
                  />
                </label>
                <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3 text-xs text-[hsl(var(--muted))]">
                  {selectedAsset ? (
                    <>
                      <p>{selectedAsset.name ?? selectedAsset.code}</p>
                      <p className="mt-1">
                        Methods: {selectedAsset.methods.join(', ') || 'Not advertised'}
                      </p>
                      <p className="mt-1">
                        Limits: {selectedAsset.minAmount ?? 'unknown'} –{' '}
                        {selectedAsset.maxAmount ?? 'unknown'}
                      </p>
                    </>
                  ) : (
                    'Select an advertised asset.'
                  )}
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-md border border-white/10 px-3 py-2 text-sm disabled:opacity-50"
                  disabled={!amount || !asset || !info.quoteServer}
                  onClick={() => void getQuote()}
                >
                  Get fresh quote
                </button>
                <button
                  className="rounded-md bg-[hsl(var(--accent))] px-3 py-2 text-sm font-medium text-black disabled:opacity-50"
                  disabled={!asset || (info.authenticationRequired && !authToken)}
                  onClick={() => void start()}
                >
                  Start hosted flow
                </button>
              </div>
              {quote ? (
                <div className="rounded-lg border border-white/[0.08] p-4 text-sm">
                  <p className="font-medium">Quote from {quote.source}</p>
                  <p className="mt-1 text-[hsl(var(--muted))]">
                    {quote.sellAmount ?? '—'} {quote.sellAsset} → {quote.buyAmount ?? '—'}{' '}
                    {quote.buyAsset}
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                    Fee: {quote.fee ?? 'unknown'} {quote.feeAsset ?? ''} · Expires:{' '}
                    {quote.expiresAt ? new Date(quote.expiresAt).toLocaleString() : 'unknown'}
                  </p>
                </div>
              ) : null}
              {message ? <p className="text-sm text-emerald-200">{message}</p> : null}
              {flow || returnedLocalId ? (
                transaction.data ? (
                  <FlowStatus transaction={transaction.data} />
                ) : (
                  <Skeleton className="h-24" />
                )
              ) : null}
            </>
          )}
        </Card>
      </div>
      <Card className="p-5">
        <SectionHeader
          title="Your anchor activity"
          description="Statuses remain source-aware and are refreshed from the anchor; no transfer is marked complete early."
        />
        {history.isLoading ? (
          <Skeleton className="mt-5 h-32" />
        ) : history.data?.length ? (
          <div className="mt-5 space-y-2">
            {history.data.map((item) => (
              <FlowStatus key={item.localId} transaction={item} compact />
            ))}
          </div>
        ) : (
          <EmptyState
            title="No anchor transactions"
            description="Started deposit and withdrawal flows will appear here."
          />
        )}
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/[0.08] bg-white/[0.03] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-2 text-sm">{value}</p>
    </div>
  );
}
function FlowStatus({
  transaction,
  compact = false,
}: {
  transaction: AnchorTransaction;
  compact?: boolean;
}) {
  return (
    <div className={`rounded-lg border border-white/[0.08] p-4 ${compact ? '' : 'mt-4'}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {transaction.kind} · {transaction.anchor}
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {transaction.id} · {transaction.status}
          </p>
        </div>
        <StatusBadge
          tone={
            transaction.state === 'completed'
              ? 'positive'
              : transaction.state === 'failed' || transaction.state === 'expired'
                ? 'negative'
                : 'warning'
          }
        >
          {transaction.state}
        </StatusBadge>
      </div>
      {transaction.userActionRequired && transaction.userActionUrl ? (
        <a
          className="mt-3 inline-block text-sm text-[hsl(var(--accent))]"
          href={transaction.userActionUrl}
          target="_blank"
          rel="noreferrer"
        >
          Continue with anchor ↗
        </a>
      ) : null}
      {transaction.stellarTransactionId ? (
        <p className="mt-2 break-all text-xs text-[hsl(var(--muted))]">
          Stellar transaction: {transaction.stellarTransactionId}
        </p>
      ) : null}
    </div>
  );
}
