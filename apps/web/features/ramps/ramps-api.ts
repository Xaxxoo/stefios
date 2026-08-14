import { api } from '../../lib/api/client';

export type AnchorAsset = {
  code: string;
  issuer: string | null;
  asset: string;
  type: 'stellar' | 'fiat' | 'crypto' | 'unknown';
  name: string | null;
  countryCode: string | null;
  depositEnabled: boolean;
  withdrawEnabled: boolean;
  methods: readonly string[];
  minAmount: string | null;
  maxAmount: string | null;
};
export type AnchorSummary = {
  slug: string;
  domain: string;
  network: 'mainnet' | 'testnet';
  name: string;
  description: string | null;
  organizationUrl: string | null;
  stellarTomlUrl: string;
  protocols: readonly ('sep6' | 'sep24' | 'sep31')[];
  authenticationRequired: boolean;
  webAuthEndpoint: string | null;
  kycServer: string | null;
  transferServer: string | null;
  hostedTransferServer: string | null;
  quoteServer: string | null;
  crossBorderServer: string | null;
  assetCount: number;
};
export type AnchorInfo = AnchorSummary & {
  assets: readonly AnchorAsset[];
  source: 'sep-1';
  discoveredAt: string;
};
export type AnchorTransaction = {
  id: string;
  localId: string;
  anchor: string;
  network: 'mainnet' | 'testnet';
  kind: string;
  status: string;
  state: 'active' | 'expired' | 'completed' | 'failed' | 'unknown';
  amountIn: string | null;
  amountOut: string | null;
  amountFee: string | null;
  assetIn: string | null;
  assetOut: string | null;
  stellarTransactionId: string | null;
  externalTransactionId: string | null;
  startedAt: string | null;
  updatedAt: string | null;
  userActionRequired: boolean;
  userActionUrl: string | null;
  interactiveUrl: string | null;
  rawStatus: string;
};
export type AnchorQuote = {
  id: string | null;
  sellAsset: string;
  buyAsset: string;
  sellAmount: string | null;
  buyAmount: string | null;
  price: string | null;
  fee: string | null;
  feeAsset: string | null;
  expiresAt: string | null;
  source: string;
};

export const rampsApi = {
  list: (network: string) => api.get<readonly AnchorSummary[]>(`/anchors?network=${network}`),
  discover: (domain: string, network: string) =>
    api.post<AnchorSummary>('/anchors/discover', { domain, network }),
  get: (slug: string, network: string) =>
    api.get<AnchorInfo>(`/anchors/${encodeURIComponent(slug)}?network=${network}`),
  authChallenge: (slug: string, network: string, account: string) =>
    api.post<{ transaction: string; expiresAt: string | null }>(
      `/anchors/${encodeURIComponent(slug)}/auth/challenge?network=${network}`,
      { account },
    ),
  authVerify: (slug: string, network: string, signedTransaction: string) =>
    api.post<{ token: string; expiresAt: string | null }>(
      `/anchors/${encodeURIComponent(slug)}/auth/verify?network=${network}`,
      { signedTransaction },
    ),
  quote: (slug: string, network: string, params: Record<string, string>) =>
    api.get<AnchorQuote>(
      `/anchors/${encodeURIComponent(slug)}/quotes?network=${network}&${new URLSearchParams(params)}`,
    ),
  start: (slug: string, network: string, body: Record<string, unknown>) =>
    api.post<AnchorTransaction>(
      `/anchors/${encodeURIComponent(slug)}/${body.kind === 'withdraw' ? 'withdraw' : 'deposit'}?network=${network}`,
      body,
    ),
  history: (network: string) =>
    api.get<readonly AnchorTransaction[]>(`/anchors/transactions?network=${network}`),
  transaction: (localId: string) =>
    api.get<AnchorTransaction>(`/anchors/transactions/${encodeURIComponent(localId)}`),
};
