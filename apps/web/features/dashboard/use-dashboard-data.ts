'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useWallet } from '../../lib/wallet/context';
import { useSession } from '../../lib/session/context';
import { dashboardApi } from './dashboard-api';

export function useDashboardData() {
  const { address: walletAddress, network: walletNetwork } = useWallet();
  const { session } = useSession();
  const address = walletAddress ?? session?.accountAddress ?? null;
  const network = walletNetwork ?? (session?.network as 'testnet' | 'mainnet' | undefined) ?? null;
  const enabled = Boolean(address && network);
  const key = ['dashboard', network, address];
  const query = useQuery({
    queryKey: [...key, 'portfolio'],
    queryFn: () => dashboardApi.portfolio(address as string, network as string),
    enabled,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const allocation = useQuery({
    queryKey: [...key, 'allocation'],
    queryFn: () => dashboardApi.allocation(address as string, network as string),
    enabled,
    staleTime: 30_000,
  });
  const history = useQuery({
    queryKey: [...key, 'history'],
    queryFn: () => dashboardApi.history(address as string, network as string),
    enabled,
    staleTime: 30_000,
  });
  const syncStatus = useQuery({
    queryKey: [...key, 'sync-status'],
    queryFn: () => dashboardApi.syncStatus(address as string, network as string),
    enabled,
    staleTime: 5_000,
    refetchInterval: (data) =>
      data.state.data?.streams.some((stream) => ['queued', 'running'].includes(stream.status))
        ? 3_000
        : false,
  });
  const queryClient = useQueryClient();
  const sync = useMutation({
    mutationFn: () => dashboardApi.sync(address as string, network as string),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: key });
    },
  });
  const refresh = async () => {
    if (!enabled) return;
    await Promise.all([
      query.refetch(),
      allocation.refetch(),
      history.refetch(),
      syncStatus.refetch(),
    ]);
  };
  return { address, network, enabled, query, allocation, history, syncStatus, sync, refresh };
}
