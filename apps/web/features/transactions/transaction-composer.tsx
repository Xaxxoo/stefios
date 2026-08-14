'use client';

import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, ErrorState, Skeleton, StatusBadge } from '../../components/ui/design-system';
import { useWallet } from '../../lib/wallet/context';
import {
  transactionComposerApi,
  type ComposerRequest,
  type ComposedTransaction,
} from './transaction-composer-api';

type ComposerStage =
  | 'idle'
  | 'composing'
  | 'previewed'
  | 'signing'
  | 'submitting'
  | 'monitoring'
  | 'confirmed'
  | 'failed';
const stages: readonly ComposerStage[] = [
  'composing',
  'previewed',
  'signing',
  'submitting',
  'monitoring',
  'confirmed',
];

export function TransactionComposer({
  request,
  onComplete,
}: {
  request: ComposerRequest;
  onComplete?: (hash: string) => void;
}) {
  const { address, network, signTransaction } = useWallet();
  const client = useQueryClient();
  const [stage, setStage] = useState<ComposerStage>('idle');
  const [composed, setComposed] = useState<ComposedTransaction | null>(null);
  const [hash, setHash] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const monitoring = useQuery({
    queryKey: ['transaction-composer', hash],
    queryFn: () => transactionComposerApi.monitor(hash as string),
    enabled: Boolean(hash),
    refetchInterval: (query) =>
      query.state.data?.status === 'SUCCESS' || query.state.data?.successful ? false : 4_000,
  });
  useEffect(() => {
    if (!monitoring.data || !hash) return;
    if (monitoring.data.status === 'SUCCESS' || monitoring.data.successful) {
      setStage('confirmed');
      void client.invalidateQueries({ queryKey: ['portfolio'] });
      void client.invalidateQueries({ queryKey: ['defi'] });
      void client.invalidateQueries({ queryKey: ['yield'] });
      void client.invalidateQueries({ queryKey: ['risk'] });
      onComplete?.(hash);
    }
  }, [client, hash, monitoring.data, onComplete]);
  const compose = async () => {
    if (!address || !network) return setError('Connect a wallet before composing a transaction.');
    setError(null);
    setStage('composing');
    try {
      const result = await transactionComposerApi.compose({
        ...request,
        account: address,
        network,
      });
      setComposed(result);
      setStage('previewed');
    } catch (caught) {
      setStage('failed');
      setError(caught instanceof Error ? caught.message : 'Transaction composition failed');
    }
  };
  const approveAndSign = async () => {
    if (!composed || !network) return;
    setError(null);
    setStage('signing');
    try {
      const signed = await signTransaction(composed.transactionXdr);
      setStage('submitting');
      const result = await transactionComposerApi.submit(network, signed);
      setHash(result.hash);
      setStage('monitoring');
    } catch (caught) {
      setStage('failed');
      setError(caught instanceof Error ? caught.message : 'Wallet signing or submission failed');
    }
  };
  if (stage === 'idle')
    return (
      <button
        className="rounded-md border border-white/10 px-3 py-2 text-sm"
        onClick={() => void compose()}
      >
        Review transaction
      </button>
    );
  if (stage === 'composing')
    return (
      <Card className="p-5">
        <Skeleton className="h-20" />
      </Card>
    );
  if (error)
    return (
      <ErrorState
        title="Transaction could not continue"
        description={error}
        action={
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-sm"
            onClick={() => {
              setError(null);
              setStage('idle');
            }}
          >
            Try again
          </button>
        }
      />
    );
  if (!composed) return null;
  return (
    <Card className="space-y-5 p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.14em] text-[hsl(var(--muted))]">
            Human-readable preview
          </p>
          <h3 className="mt-1 text-lg font-medium">{composed.preview.title}</h3>
        </div>
        <StatusBadge
          tone={stage === 'confirmed' ? 'positive' : stage === 'failed' ? 'negative' : 'info'}
        >
          {stage}
        </StatusBadge>
      </div>
      <p className="text-sm text-[hsl(var(--muted))]">{composed.preview.summary}</p>
      <div className="grid gap-3 sm:grid-cols-3">
        <PreviewValue
          label="Input"
          value={composed.intent.inputAssets.map((item) => item.amount).join(', ') || '—'}
        />
        <PreviewValue
          label="Expected output"
          value={composed.intent.expectedOutputs.map((item) => item.amount).join(', ') || '—'}
        />
        <PreviewValue
          label="Minimum output"
          value={composed.intent.minimumOutputs.map((item) => item.amount).join(', ') || '—'}
        />
      </div>
      <div className="rounded-lg border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm">
        <p className="font-medium text-amber-100">Warnings</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-[hsl(var(--muted))]">
          {composed.preview.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      </div>
      <details className="rounded-lg border border-white/[0.08] p-4 text-sm">
        <summary className="cursor-pointer font-medium">Decoded transaction details</summary>
        <pre className="mt-3 overflow-auto text-xs text-[hsl(var(--muted))]">
          {JSON.stringify(composed.preview.decoded, null, 2)}
        </pre>
      </details>
      {stage === 'previewed' ? (
        <button
          className="w-full rounded-md bg-[hsl(var(--accent))] px-4 py-3 text-sm font-medium text-black"
          onClick={() => void approveAndSign()}
        >
          Approve and sign with connected wallet
        </button>
      ) : null}
      {stage === 'monitoring' ? (
        <p className="text-sm text-[hsl(var(--muted))]">
          Submitted as <span className="font-mono">{hash}</span>. Waiting for confirmation before
          refreshing portfolio data.
        </p>
      ) : null}
      {stage === 'confirmed' ? (
        <p className="text-sm text-emerald-200">
          Confirmed. Portfolio, DeFi, yield, and risk data are refreshing.
        </p>
      ) : null}
      <div className="flex flex-wrap gap-2 text-xs text-[hsl(var(--muted))]">
        {stages.map((item) => (
          <span className={item === stage ? 'text-white' : ''} key={item}>
            {item.replaceAll('_', ' ')}
          </span>
        ))}
      </div>
    </Card>
  );
}
function PreviewValue({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 tabular-nums">{value}</p>
    </div>
  );
}
