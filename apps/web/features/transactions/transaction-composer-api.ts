import { api } from '../../lib/api/client';

export type ComposerRequest = {
  account: string;
  protocol: string;
  network: 'mainnet' | 'testnet';
  action: string;
  marketId?: string;
  amount?: string;
  decimals?: number;
  asset?: unknown;
  quoteAsset?: unknown;
  minReceived?: string;
  slippageBps?: string;
  positionId?: string;
  quoteExpiresAt?: string;
  destination?: string;
  memo?: string;
  pathMode?: 'strictSend' | 'strictReceive';
  destAmount?: string;
  destMin?: string;
};
export type ComposedTransaction = {
  lifecycle: 'previewed';
  intent: {
    action: string;
    protocol: string;
    network: string;
    inputAssets: readonly { asset: unknown; amount: string }[];
    expectedOutputs: readonly { asset: unknown; amount: string }[];
    minimumOutputs: readonly { asset: unknown; amount: string }[];
    fees: readonly { currency: string; amount: string }[];
    priceImpact: string | null;
    slippage: string | null;
    expiration: string;
    warnings: readonly string[];
  };
  transactionXdr: string;
  preview: {
    title: string;
    summary: string;
    warnings: readonly string[];
    simulation: unknown;
    decoded: Record<string, unknown>;
  };
};
export const transactionComposerApi = {
  compose: (request: ComposerRequest) =>
    api.post<ComposedTransaction>('/transactions/compose', request),
  submit: (network: string, signedTransactionXdr: string) =>
    api.post<{ lifecycle: 'submitted'; hash: string; network: string }>('/transactions/submit', {
      network,
      signedTransactionXdr,
    }),
  monitor: (hash: string) =>
    api.get<{ status?: string; successful?: boolean }>(
      `/transactions/${encodeURIComponent(hash)}/status`,
    ),
};
