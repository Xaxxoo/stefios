import type {
  AssetAmount,
  AssetId,
  CurrencyAmount,
  Network,
  RiskMetric,
  YieldOpportunity,
} from '@sfo/shared';

export type ProtocolId = 'blend' | 'aquarius' | 'sushi' | 'templar';
export type ProtocolOperation =
  | 'supply'
  | 'withdraw'
  | 'borrow'
  | 'repay'
  | 'depositLiquidity'
  | 'withdrawLiquidity'
  | 'claim'
  | 'swap';

export type ProtocolCapabilities = Readonly<Record<ProtocolOperation, boolean>>;

export type ProtocolMarket = {
  id: string;
  protocol: ProtocolId;
  network: Network;
  name: string;
  assets: readonly AssetId[];
  category: 'lending' | 'liquidity' | 'exchange';
  enabled: boolean;
  source: string;
  asOf: Date;
  reserves?: readonly ProtocolReserveMetrics[];
  poolType?: string | null;
  fee?: string | null;
};

export type ProtocolIncentive = {
  kind: 'supply' | 'borrow';
  token: AssetId | null;
  rate: string | null;
  source: string;
};

export type ProtocolReserveMetrics = {
  asset: AssetId;
  decimals: number;
  totalSupply: string | null;
  totalBorrow: string | null;
  supplyApr: string | null;
  supplyApy: string | null;
  borrowApr: string | null;
  borrowApy: string | null;
  utilization: string | null;
  incentives: readonly ProtocolIncentive[];
};

export type ProtocolMarketMetrics = {
  marketId: string;
  tvl: CurrencyAmount | null;
  totalSupply: CurrencyAmount | null;
  totalBorrow: CurrencyAmount | null;
  volume24h: CurrencyAmount | null;
  utilization: string | null;
  asOf: Date;
  source: string;
  reserves?: readonly ProtocolReserveMetrics[];
};

export type ProtocolPosition = {
  id: string;
  protocol: ProtocolId;
  marketId: string | null;
  account: string;
  kind: 'supply' | 'borrow' | 'liquidity' | 'reward';
  assets: readonly AssetAmount[];
  value: CurrencyAmount | null;
  healthRatio: string | null;
  source: string;
  asOf: Date;
  rewards?: readonly ProtocolReward[];
};

export type ProtocolReward = {
  token: AssetId | null;
  amount: string;
  source: string;
};

export type ProtocolYieldMetrics = Omit<YieldOpportunity, 'tvl'> & {
  tvl: CurrencyAmount | null;
  source: string;
};
export type ProtocolRiskMetrics = RiskMetric & {
  protocol: ProtocolId;
  marketId: string | null;
  source: string;
  asOf: Date;
};

export type ProtocolTransactionRequest = {
  account: string;
  network: Network;
  marketId?: string;
  asset?: AssetId;
  amount?: string;
  quoteAsset?: AssetId;
  minReceived?: string;
  slippageBps?: string;
  destination?: string;
  positionId?: string;
  decimals?: number;
  reserveTokenIds?: readonly number[];
  tokenAssets?: readonly AssetId[];
  poolIndex?: string;
  amounts?: readonly string[];
  minShares?: string;
  minAmounts?: readonly string[];
  quote?: ProtocolQuote;
};

export type ProtocolQuote = {
  protocol: ProtocolId;
  network: Network;
  tokenIn: AssetId;
  tokenOut: AssetId;
  amountIn: string;
  amountOut: string;
  route: readonly string[];
  routeXdr: string;
  priceImpact: string | null;
  slippageBps: string;
  source: string;
  quotedAt: Date;
  stale: boolean;
};

export type UnsignedProtocolTransaction = {
  protocol: ProtocolId;
  operation: ProtocolOperation;
  network: Network;
  sourceAccount: string;
  marketId: string | null;
  asset: AssetId | null;
  amount: string | null;
  quoteAsset: AssetId | null;
  minReceived: string | null;
  slippageBps: string | null;
  destination: string | null;
  positionId: string | null;
  decimals: number | null;
  reserveTokenIds: readonly number[];
  requiredSigners: readonly string[];
  status: 'unsigned' | 'simulated';
};

export type ProtocolDataSource = {
  discoverMarkets?(protocol: ProtocolId, network: Network): Promise<readonly ProtocolMarket[]>;
  getMarket?(
    protocol: ProtocolId,
    network: Network,
    marketId: string,
  ): Promise<ProtocolMarket | null>;
  getMarketMetrics?(
    protocol: ProtocolId,
    network: Network,
    marketId: string,
  ): Promise<ProtocolMarketMetrics | null>;
  getUserPositions?(
    protocol: ProtocolId,
    network: Network,
    account: string,
  ): Promise<readonly ProtocolPosition[]>;
  getYieldMetrics?(
    protocol: ProtocolId,
    network: Network,
  ): Promise<readonly ProtocolYieldMetrics[]>;
  getRiskMetrics?(
    protocol: ProtocolId,
    network: Network,
    account?: string,
  ): Promise<readonly ProtocolRiskMetrics[]>;
  buildTransaction?(request: UnsignedProtocolTransaction): Promise<UnsignedProtocolTransaction>;
};
