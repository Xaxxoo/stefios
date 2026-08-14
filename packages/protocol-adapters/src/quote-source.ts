import type { AssetId, Network } from '@sfo/shared';
import type { ProtocolQuote } from './types';

export type QuoteRequest = {
  network: Network;
  tokenIn: AssetId;
  tokenOut: AssetId;
  amountIn: string;
  slippageBps: string;
  decimals?: number;
  strictReceive?: boolean;
};

export interface SwapQuoteSource {
  readonly id: string;
  quote(request: QuoteRequest): Promise<ProtocolQuote>;
}
