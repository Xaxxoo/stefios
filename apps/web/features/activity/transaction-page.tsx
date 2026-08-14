'use client';

import { useQuery } from '@tanstack/react-query';
import {
  Card,
  EmptyState,
  ErrorState,
  PageHeader,
  Skeleton,
  StatusBadge,
} from '../../components/ui/design-system';
import { useSession } from '../../lib/session/context';
import { activityApi } from './activity-api';

export function TransactionPage({ hash }: { hash: string }) {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ['transaction', hash],
    queryFn: () => activityApi.detail(hash),
    enabled: Boolean(session && hash),
    staleTime: 15_000,
    refetchInterval: (current) =>
      current.state.data?.status === 'confirmed' || current.state.data?.status === 'failed'
        ? false
        : 4_000,
  });
  if (!session)
    return (
      <EmptyState
        title="Sign in to view transaction details"
        description="Transaction details are restricted to the authenticated wallet session."
      />
    );
  if (query.isLoading)
    return (
      <div className="space-y-5">
        <Skeleton className="h-24" />
        <Skeleton className="h-72" />
      </div>
    );
  if (query.error || !query.data)
    return (
      <ErrorState
        title="Transaction unavailable"
        description="This transaction could not be found or normalized."
      />
    );
  const tx = query.data;
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Audit trail"
        title="Transaction detail"
        description={tx.summary}
        actions={
          <StatusBadge
            tone={
              tx.status === 'confirmed'
                ? 'positive'
                : tx.status === 'failed'
                  ? 'negative'
                  : 'warning'
            }
          >
            {tx.status}
          </StatusBadge>
        }
      />
      <Card className="grid gap-5 p-5 sm:grid-cols-2">
        <Info label="Hash" value={tx.hash} />
        <Info
          label="Time"
          value={tx.timestamp ? new Date(tx.timestamp).toLocaleString() : 'Unavailable'}
        />
        <Info label="Source" value={tx.source ?? 'Unavailable'} />
        <Info label="Network" value={tx.network} />
        <Info label="Fee" value={tx.fee ?? 'Unavailable'} />
        <Info label="Protocol" value={tx.protocol ?? 'Stellar'} />
      </Card>
      <Card className="p-5">
        <h2 className="font-medium">Operations</h2>
        <div className="mt-4 space-y-3">
          {tx.operations.length ? (
            tx.operations.map((operation) => (
              <div
                className="flex flex-wrap justify-between gap-3 border-b border-white/[0.08] pb-3 text-sm last:border-0"
                key={`${operation.index}-${operation.type}`}
              >
                <span>{operation.type}</span>
                <span className="text-[hsl(var(--muted))]">
                  {operation.source ?? 'Source unavailable'}
                </span>
              </div>
            ))
          ) : (
            <p className="text-sm text-[hsl(var(--muted))]">No operation details available.</p>
          )}
        </div>
      </Card>
      <Card className="p-5">
        <h2 className="font-medium">Assets and payments</h2>
        <div className="mt-4 space-y-3">
          {tx.payments.length ? (
            tx.payments.map((payment, index) => (
              <div
                className="rounded-md bg-white/[0.03] p-3 text-sm"
                key={`${payment.asset}-${index}`}
              >
                <p className="font-medium">
                  {payment.amount} {payment.asset}
                </p>
                <p className="mt-1 break-all text-xs text-[hsl(var(--muted))]">
                  {payment.from} → {payment.to}
                </p>
                {payment.memo ? <p className="mt-2 text-xs">Memo: {payment.memo}</p> : null}
              </div>
            ))
          ) : (
            <p className="text-sm text-[hsl(var(--muted))]">No payment asset details available.</p>
          )}
        </div>
      </Card>
      <a
        className="inline-block text-sm text-[hsl(var(--accent))]"
        href={tx.explorerUrl}
        target="_blank"
        rel="noreferrer"
      >
        View on Stellar explorer ↗
      </a>
    </div>
  );
}
function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-[0.1em] text-[hsl(var(--muted))]">{label}</p>
      <p className="mt-1 break-all text-sm">{value}</p>
    </div>
  );
}
