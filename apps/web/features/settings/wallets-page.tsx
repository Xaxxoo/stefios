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
import { useWallet } from '../../lib/wallet/context';
import { walletsApi, type WalletRecord } from './wallets-api';
export function WalletsSettingsPage() {
  const { session } = useSession();
  const wallet = useWallet();
  const client = useQueryClient();
  const [address, setAddress] = useState('');
  const [label, setLabel] = useState('');
  const [group, setGroup] = useState('');
  const query = useQuery({
    queryKey: ['wallet-settings'],
    queryFn: () => walletsApi.list(),
    enabled: Boolean(session),
  });
  const add = useMutation({
    mutationFn: () =>
      walletsApi.addViewOnly({
        address,
        network: session?.network ?? 'testnet',
        label,
        accountGroup: group,
      }),
    onSuccess: () => {
      setAddress('');
      setLabel('');
      setGroup('');
      void client.invalidateQueries({ queryKey: ['wallet-settings'] });
    },
  });
  const sync = useMutation({
    mutationFn: ({ address: itemAddress, network }: { address: string; network: string }) =>
      walletsApi.sync(itemAddress, network),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['wallet-settings'] }),
  });
  const update = useMutation({
    mutationFn: ({
      address: itemAddress,
      network,
      label: itemLabel,
      accountGroup,
    }: {
      address: string;
      network: string;
      label: string;
      accountGroup: string;
    }) => walletsApi.update(itemAddress, network, { label: itemLabel, accountGroup }),
    onSuccess: () => void client.invalidateQueries({ queryKey: ['wallet-settings'] }),
  });
  const remove = useMutation({
    mutationFn: ({ address: itemAddress, network }: { address: string; network: string }) =>
      walletsApi.remove(itemAddress, network),
    onSuccess: async (_result, variables) => {
      if (variables.address === wallet.address) await wallet.disconnect();
      void client.invalidateQueries({ queryKey: ['wallet-settings'] });
    },
  });
  if (!session)
    return (
      <EmptyState
        title="Connect your wallet to manage accounts"
        description="Financial OS never asks for a seed phrase or private key."
        action={<ConnectWalletButton />}
      />
    );
  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Settings"
        title="Wallets"
        description="Manage connected signable accounts and explicitly view-only accounts."
        actions={<StatusBadge tone="info">{query.data?.length ?? 0} accounts</StatusBadge>}
      />
      <Card className="p-5">
        <SectionHeader
          title="Add a view-only account"
          description="View-only addresses can be synchronized and reported, but they can never sign from Financial OS."
        />
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm lg:col-span-2"
            value={address}
            onChange={(event) =>
              setAddress((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="Stellar public address"
          />
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={label}
            onChange={(event) =>
              setLabel((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="Label (optional)"
          />
          <input
            className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-2 text-sm"
            value={group}
            onChange={(event) =>
              setGroup((event.currentTarget as unknown as { value: string }).value)
            }
            placeholder="Group (optional)"
          />
        </div>
        <button
          className="mt-3 rounded-md bg-[hsl(var(--accent))] px-4 py-2 text-sm font-medium text-black disabled:opacity-50"
          disabled={!address || add.isPending}
          onClick={() => add.mutate()}
        >
          {add.isPending ? 'Adding…' : 'Add and sync'}
        </button>
      </Card>
      {query.isLoading ? (
        <Skeleton className="h-64" />
      ) : query.error ? (
        <ErrorState
          title="Wallet accounts unavailable"
          description="Could not load account connections."
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
          {query.data.map((item) => (
            <WalletRow
              key={`${item.network}-${item.address}`}
              item={item}
              onSync={() => sync.mutate({ address: item.address, network: item.network })}
              onRemove={() => remove.mutate({ address: item.address, network: item.network })}
              onUpdate={(label, accountGroup) =>
                update.mutate({ address: item.address, network: item.network, label, accountGroup })
              }
            />
          ))}
        </div>
      ) : (
        <Card className="p-6">
          <EmptyState
            title="No accounts connected"
            description="Connect a wallet or add a view-only public address."
            action={<ConnectWalletButton />}
          />
        </Card>
      )}
    </div>
  );
}
function WalletRow({
  item,
  onSync,
  onRemove,
  onUpdate,
}: {
  item: WalletRecord;
  onSync: () => void;
  onRemove: () => void;
  onUpdate: (label: string, accountGroup: string) => void;
}) {
  const [label, setLabel] = useState(item.label ?? '');
  const [accountGroup, setAccountGroup] = useState(item.accountGroup ?? '');
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={item.isViewOnly ? 'info' : 'positive'}>
              {item.isViewOnly ? 'View-only account' : 'Connected / signable account'}
            </StatusBadge>
            <span className="text-xs text-[hsl(var(--muted))]">{item.network}</span>
          </div>
          <p className="mt-3 break-all font-mono text-sm">{item.address}</p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            <input
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
              value={label}
              onChange={(event) =>
                setLabel((event.currentTarget as unknown as { value: string }).value)
              }
              placeholder="Label"
            />
            <input
              className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-xs"
              value={accountGroup}
              onChange={(event) =>
                setAccountGroup((event.currentTarget as unknown as { value: string }).value)
              }
              placeholder="Account group"
            />
          </div>
          <p className="mt-1 text-xs text-[hsl(var(--muted))]">
            Last sync: {item.lastSyncAt ? new Date(item.lastSyncAt).toLocaleString() : 'Never'}
          </p>
        </div>
        <div className="flex gap-2">
          <button className="rounded-md border border-white/10 px-3 py-2 text-xs" onClick={onSync}>
            Resync
          </button>
          <button
            className="rounded-md border border-white/10 px-3 py-2 text-xs"
            onClick={() => onUpdate(label, accountGroup)}
          >
            Save labels
          </button>
          <button
            className="rounded-md border border-rose-300/20 px-3 py-2 text-xs text-rose-200"
            onClick={onRemove}
          >
            {item.isViewOnly ? 'Remove' : 'Disconnect'}
          </button>
        </div>
      </div>
    </Card>
  );
}
