'use client';
import { useState } from 'react';
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
import { useSession } from '../../lib/session/context';
import { alertsApi, type AlertType } from './alerts-api';
const alertTypes: readonly { value: AlertType; label: string }[] = [
  { value: 'price_threshold', label: 'Price threshold' },
  { value: 'yield_threshold', label: 'Yield threshold' },
  { value: 'health_deterioration', label: 'Health deterioration' },
  { value: 'liquidation_risk', label: 'Liquidation risk' },
  { value: 'concentration_threshold', label: 'Concentration threshold' },
  { value: 'cross_chain_completed', label: 'Cross-chain completed' },
  { value: 'cross_chain_failed', label: 'Cross-chain failed' },
  { value: 'anchor_transaction_change', label: 'Anchor transaction change' },
];
export function AlertsPage() {
  const { session } = useSession();
  const client = useQueryClient();
  const [type, setType] = useState<AlertType>('price_threshold');
  const [target, setTarget] = useState('');
  const [threshold, setThreshold] = useState('');
  const [direction, setDirection] = useState<'above' | 'below'>('above');
  const [cooldown, setCooldown] = useState('3600');
  const query = useQuery({
    queryKey: ['alerts'],
    queryFn: alertsApi.list,
    enabled: Boolean(session),
  });
  const create = useMutation({
    mutationFn: () =>
      alertsApi.create({
        type,
        conditions: {
          targetRef: target || undefined,
          threshold: threshold || undefined,
          direction,
        },
        cooldownSeconds: Number(cooldown),
      }),
    onSuccess: () => {
      setTarget('');
      setThreshold('');
      void client.invalidateQueries({ queryKey: ['alerts'] });
    },
  });
  const update = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      alertsApi.update(id, { enabled }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['alerts'] }),
  });
  const remove = useMutation({
    mutationFn: alertsApi.remove,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['alerts'] }),
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to manage alerts"
        description="Alerts are evaluated for your authenticated workspace only."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Workspace"
        title="Alerts"
        description="Create source-aware signals for prices, yield, portfolio health, concentration, anchor changes, and cross-chain settlement."
        actions={<StatusBadge tone="info">Cooldown-protected</StatusBadge>}
      />
      <Card className="p-5">
        <SectionHeader
          title="Create alert"
          description="Estimated values are never treated as guaranteed execution or financial advice."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <select
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={type}
            onChange={(event) =>
              setType((event.currentTarget as unknown as { value: AlertType }).value)
            }
          >
            {alertTypes.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={target}
            onChange={(event) =>
              setTarget((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="canonical target (optional)"
          />
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={threshold}
            onChange={(event) =>
              setThreshold((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="threshold (optional)"
          />
          <select
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={direction}
            onChange={(event) =>
              setDirection((event.currentTarget as unknown as { value: typeof direction }).value)
            }
          >
            <option value="above">At or above</option>
            <option value="below">At or below</option>
          </select>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <label className="text-xs text-[hsl(var(--muted))]">
            Cooldown seconds
            <input
              className="ml-2 w-28 rounded-md border border-white/10 bg-white/[0.04] px-2 py-2 text-sm"
              value={cooldown}
              onChange={(event) =>
                setCooldown((event.currentTarget as unknown as { value: string }).value)
              }
            />
          </label>
          <button
            className="rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
            disabled={create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Creating…' : 'Create alert'}
          </button>
        </div>
        {create.error ? (
          <p className="mt-3 text-sm text-rose-200">
            {create.error instanceof Error ? create.error.message : 'Could not create alert'}
          </p>
        ) : null}
      </Card>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : query.error ? (
        <ErrorState
          title="Alerts unavailable"
          description="Could not load your alert rules."
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
          {query.data.map((rule) => (
            <Card className="p-4" key={rule.id}>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-medium">
                    {alertTypes.find((item) => item.value === rule.type)?.label ?? rule.type}
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                    Cooldown {rule.cooldownSeconds}s ·{' '}
                    {rule.lastTriggeredAt
                      ? `Last triggered ${new Date(rule.lastTriggeredAt).toLocaleString()}`
                      : 'Not triggered'}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    className="rounded-md border border-white/10 px-3 py-2 text-xs"
                    onClick={() => update.mutate({ id: rule.id, enabled: !rule.enabled })}
                  >
                    {rule.enabled ? 'Pause' : 'Enable'}
                  </button>
                  <button
                    className="rounded-md border border-rose-300/20 px-3 py-2 text-xs text-rose-200"
                    onClick={() => remove.mutate(rule.id)}
                  >
                    Remove
                  </button>
                </div>
              </div>
              <pre className="mt-3 overflow-auto rounded-md bg-white/[0.03] p-3 text-xs text-[hsl(var(--muted))]">
                {JSON.stringify(rule.conditions ?? {}, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="No alert rules"
            description="Create a rule to monitor a threshold or lifecycle event."
          />
        </Card>
      )}
    </div>
  );
}
