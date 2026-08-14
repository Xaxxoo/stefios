'use client';

import { useQuery } from '@tanstack/react-query';
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
import { useSession } from '../../lib/session/context';
import { crossChainApi, type CrossChainTransfer } from './cross-chain-api';

const states: readonly CrossChainTransfer['state'][] = [
  'created',
  'awaiting_signature',
  'submitted',
  'source_confirmed',
  'bridging',
  'destination_confirmed',
  'completed',
];
export function CrossChainPage() {
  const { session } = useSession();
  const query = useQuery({
    queryKey: ['cross-chain'],
    queryFn: crossChainApi.list,
    enabled: Boolean(session),
    refetchInterval: 15_000,
  });
  const providers = useQuery({
    queryKey: ['cross-chain-providers'],
    queryFn: crossChainApi.providers,
    staleTime: 300_000,
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to view cross-chain activity"
        description="Settlement state is scoped to your authenticated account."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settlement"
        title="Cross-chain"
        description="Monitor source confirmation, bridge progress, destination settlement, and recovery states from authoritative providers."
        actions={
          <StatusBadge tone="info">{query.isFetching ? 'Refreshing' : 'Live state'}</StatusBadge>
        }
      />
      <Card className="p-5">
        <SectionHeader
          title="Provider availability"
          description="A provider is only listed as available when a verified adapter is configured."
        />
        {providers.isLoading ? (
          <Skeleton className="mt-5 h-16" />
        ) : (
          <div className="mt-5 flex flex-wrap gap-2">
            {providers.data?.map((provider) => (
              <span
                className="rounded-full border border-white/10 px-3 py-2 text-xs"
                key={provider.id}
              >
                {provider.id} · {provider.available ? 'available' : 'not configured'}
              </span>
            ))}
          </div>
        )}
      </Card>
      {query.isLoading ? (
        <Skeleton className="h-80" />
      ) : query.error ? (
        <ErrorState
          title="Cross-chain activity unavailable"
          description="The authoritative transfer feed could not be loaded."
          action={
            <button
              className="rounded-md border border-white/10 px-3 py-2 text-sm"
              onClick={() => void query.refetch()}
            >
              Retry
            </button>
          }
        />
      ) : query.data?.length ? (
        <div className="space-y-3">
          {query.data.map((transfer) => (
            <TransferCard key={transfer.id} transfer={transfer} />
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="No cross-chain transfers"
            description="Configured provider transfers will appear here. Financial OS does not fabricate bridge availability or settlement state."
          />
        </Card>
      )}
    </div>
  );
}
function TransferCard({ transfer }: { transfer: CrossChainTransfer }) {
  const index = states.indexOf(transfer.state);
  const terminal = transfer.state === 'failed' || transfer.state === 'recovery_required';
  return (
    <Card className="p-5 transition hover:border-white/20">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-medium">
            {transfer.amount} {transfer.sourceAsset ?? 'asset'}{' '}
            <span className="text-[hsl(var(--muted))]">→</span> {transfer.destinationChain}
          </p>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            {transfer.provider} · {transfer.sourceChain} → {transfer.destinationChain}
          </p>
        </div>
        <StatusBadge
          tone={transfer.state === 'completed' ? 'positive' : terminal ? 'negative' : 'warning'}
        >
          {transfer.state.replaceAll('_', ' ')}
        </StatusBadge>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-7">
        {states.map((state, current) => (
          <div
            key={state}
            className={`h-1 rounded-full ${current <= index && !terminal ? 'bg-[hsl(var(--accent))]' : 'bg-white/10'}`}
            title={state}
          />
        ))}
      </div>
      {transfer.error ? <p className="mt-3 text-sm text-rose-200">{transfer.error}</p> : null}
      <p className="mt-3 text-xs text-[hsl(var(--muted))]">
        Updated {new Date(transfer.updatedAt).toLocaleString()}
      </p>
    </Card>
  );
}
