import { api } from '../../lib/api/client';

export type AssetIdentity = {
  network: 'mainnet' | 'testnet';
  type: 'native' | 'classic' | 'contract';
  assetCode?: string;
  issuerAddress?: string;
  contractAddress?: string;
};
export type UnifiedQuote = {
  inputAsset: AssetIdentity;
  inputAmount: string;
  outputAsset: AssetIdentity;
  expectedOutput: string;
  minimumReceived: string;
  exchangeRate: string;
  priceImpact: string | null;
  networkFee: string | null;
  protocolFees: string | null;
  route: readonly string[];
  provider: string;
  expiration: string;
  stale: boolean;
  risk: 'low' | 'medium' | 'high' | 'unknown';
  score: string;
  warnings: readonly string[];
};
export type QuoteResult = {
  quotes: readonly UnifiedQuote[];
  recommended: UnifiedQuote | null;
  providers: readonly { provider: string; status: string }[];
};
export const swapApi = {
  quotes: (request: {
    network: string;
    tokenIn: AssetIdentity;
    tokenOut: AssetIdentity;
    amountIn: string;
    slippageBps: string;
    decimals?: number;
  }) => api.post<QuoteResult>('/swap/quotes', request),
};
