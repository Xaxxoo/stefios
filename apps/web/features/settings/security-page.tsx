'use client';
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
import { securityApi } from './security-api';
export function SecuritySettingsPage() {
  const { session } = useSession();
  const client = useQueryClient();
  const sessions = useQuery({
    queryKey: ['security-sessions'],
    queryFn: securityApi.sessions,
    enabled: Boolean(session),
  });
  const preferences = useQuery({
    queryKey: ['security-preferences'],
    queryFn: securityApi.preferences,
    enabled: Boolean(session),
  });
  const update = useMutation({
    mutationFn: securityApi.updatePreferences,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['security-preferences'] }),
  });
  const revoke = useMutation({
    mutationFn: securityApi.revoke,
    onSuccess: () => void client.invalidateQueries({ queryKey: ['security-sessions'] }),
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to review security"
        description="Financial OS never provides seed phrase or private-key management."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Security"
        description="Review active sessions, transaction confirmation preferences, and the wallet-owned signing boundary."
        actions={<StatusBadge tone="positive">Non-custodial</StatusBadge>}
      />
      <Card className="p-5">
        <SectionHeader
          title="Transaction confirmation"
          description="These preferences affect Financial OS previews; your wallet remains the final signing authority."
        />
        {preferences.isLoading ? (
          <Skeleton className="mt-5 h-20" />
        ) : preferences.error ? (
          <ErrorState
            title="Preferences unavailable"
            description="Could not load security preferences."
          />
        ) : preferences.data ? (
          <div className="mt-5 space-y-3">
            <Toggle
              label="Require transaction review"
              checked={preferences.data.requireTransactionReview}
              onChange={(checked) => update.mutate({ requireTransactionReview: checked })}
            />
            <Toggle
              label="Show simulation warnings"
              checked={preferences.data.showSimulationWarnings}
              onChange={(checked) => update.mutate({ showSimulationWarnings: checked })}
            />
          </div>
        ) : null}
      </Card>
      <Card className="p-5">
        <SectionHeader
          title="Active application sessions"
          description="Revoke sessions you no longer recognize. Revocation does not affect wallet keys."
        />
        {sessions.isLoading ? (
          <Skeleton className="mt-5 h-48" />
        ) : sessions.error ? (
          <ErrorState
            title="Sessions unavailable"
            description="Could not load application sessions."
            action={
              <button
                className="rounded-md border border-white/10 px-3 py-2 text-sm"
                onClick={() => void sessions.refetch()}
              >
                Retry
              </button>
            }
          />
        ) : (
          <div className="mt-5 space-y-3">
            {sessions.data?.map((item) => (
              <div
                className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-white/[0.08] p-4"
                key={item.id}
              >
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={item.revokedAt ? 'negative' : 'positive'}>
                      {item.revokedAt ? 'Revoked' : 'Active'}
                    </StatusBadge>
                    <span className="text-xs text-[hsl(var(--muted))]">{item.network}</span>
                  </div>
                  <p className="mt-2 text-sm">{item.userAgent ?? 'Wallet application'}</p>
                  <p className="mt-1 text-xs text-[hsl(var(--muted))]">
                    Created {new Date(item.createdAt).toLocaleString()} · Last used{' '}
                    {item.lastUsedAt ? new Date(item.lastUsedAt).toLocaleString() : 'Unknown'}
                  </p>
                </div>
                {!item.revokedAt ? (
                  <button
                    className="rounded-md border border-rose-300/20 px-3 py-2 text-xs text-rose-200"
                    onClick={() => revoke.mutate(item.id)}
                  >
                    Revoke
                  </button>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
      <Card className="p-5">
        <SectionHeader
          title="Wallet security guidance"
          description="Financial OS cannot recover or manage wallet keys."
        />
        <ul className="mt-5 list-disc space-y-2 pl-5 text-sm text-[hsl(var(--muted))]">
          <li>
            Approve only transactions whose recipient, assets, amounts, fees, and warnings you
            understand.
          </li>
          <li>
            Keep recovery phrases and private keys exclusively in your wallet’s secure recovery
            process.
          </li>
          <li>
            Use a dedicated wallet or view-only account for monitoring workflows that do not require
            signing.
          </li>
          <li>Check the connected application origin before approving a wallet request.</li>
        </ul>
      </Card>
      <Card className="p-5">
        <SectionHeader
          title="Trusted application domain"
          description="Wallet signing requests originate from the configured Financial OS web application."
        />
        <p className="mt-4 break-all font-mono text-sm">
          {preferences.data?.trustedApplicationOrigin ?? 'Unavailable'}
        </p>
        <p className="mt-2 text-xs text-[hsl(var(--muted))]">
          Always verify this domain in your browser and wallet before signing.
        </p>
      </Card>
    </div>
  );
}
function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-lg border border-white/[0.08] p-4 text-sm">
      <span>{label}</span>
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) =>
          onChange((event.currentTarget as unknown as { checked: boolean }).checked)
        }
      />
    </label>
  );
}
