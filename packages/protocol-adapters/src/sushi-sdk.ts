import type { AssetId, Network } from '@sfo/shared';
import { BaseProtocolAdapter } from './adapter';
import type {
  ProtocolCapabilities,
  ProtocolMarket,
  ProtocolMarketMetrics,
  ProtocolPosition,
  ProtocolQuote,
  ProtocolRiskMetrics,
  ProtocolTransactionRequest,
  ProtocolYieldMetrics,
  UnsignedProtocolTransaction,
} from './types';

const SOURCE = '@sushi/stellar-provider-boundary';

export type SushiPool = ProtocolMarket & {
  feeTier?: string | null;
  concentrated?: boolean;
};
export type SushiPosition = ProtocolPosition & {
  feeTier?: string | null;
};
export type SushiPreparedTransaction = UnsignedProtocolTransaction & {
  status: 'simulated';
  transactionXdr: string;
  preview: {
    title: string;
    summary: string;
    warnings: readonly string[];
    simulation: { status: 'success' | 'failed'; error?: string };
  };
};

export type SushiProviderStatus = {
  status: 'available' | 'unavailable';
  source: string;
  reason: string | null;
  checkedAt: Date;
};

export type SushiProvider = {
  status(network: Network): Promise<SushiProviderStatus>;
  discoverPools(network: Network): Promise<readonly SushiPool[]>;
  getPool?(network: Network, poolId: string): Promise<SushiPool | null>;
  getPositions?(network: Network, account: string): Promise<readonly SushiPosition[]>;
  getYield?(network: Network): Promise<readonly ProtocolYieldMetrics[]>;
  getRisk?(network: Network, account: string): Promise<readonly ProtocolRiskMetrics[]>;
  quote?(request: import('./quote-source').QuoteRequest): Promise<ProtocolQuote>;
  buildTransaction?(
    operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees' | 'swap',
    request: ProtocolTransactionRequest,
  ): Promise<SushiPreparedTransaction>;
};

export class SushiDataUnavailableError extends Error {
  constructor(message = 'No verified Sushi-on-Stellar provider is configured') {
    super(message);
    this.name = 'SushiDataUnavailableError';
  }
}

export class UnavailableSushiProvider implements SushiProvider {
  async status(_network: Network): Promise<SushiProviderStatus> {
    return {
      status: 'unavailable',
      source: SOURCE,
      reason: 'Official Stellar contract/API interface has not been configured',
      checkedAt: new Date(),
    };
  }
  async discoverPools(_network: Network): Promise<readonly SushiPool[]> {
    throw new SushiDataUnavailableError();
  }
  async getPositions(_network: Network, _account: string): Promise<readonly SushiPosition[]> {
    throw new SushiDataUnavailableError();
  }
  async getYield(_network: Network): Promise<readonly ProtocolYieldMetrics[]> {
    throw new SushiDataUnavailableError();
  }
  async getRisk(_network: Network, _account: string): Promise<readonly ProtocolRiskMetrics[]> {
    throw new SushiDataUnavailableError();
  }
  async buildTransaction(
    _operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees' | 'swap',
    _request: ProtocolTransactionRequest,
  ): Promise<SushiPreparedTransaction> {
    throw new SushiDataUnavailableError(
      'Sushi actions are disabled until a verified Stellar provider is configured',
    );
  }
}

export class SushiSdkAdapter extends BaseProtocolAdapter {
  readonly id = 'sushi' as const;
  readonly name = 'Sushi';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'depositLiquidity',
    'withdrawLiquidity',
    'claim',
    'swap',
  );

  constructor(private readonly provider: SushiProvider) {
    super();
  }
  async status(network: Network) {
    return this.provider.status(network);
  }
  override discoverMarkets(network: Network) {
    return this.provider.discoverPools(network);
  }
  override getMarket(network: Network, marketId: string) {
    return this.provider.getPool?.(network, marketId) ?? Promise.resolve(null);
  }
  override getMarketMetrics(
    network: Network,
    marketId: string,
  ): Promise<ProtocolMarketMetrics | null> {
    return this.getMarket(network, marketId).then((market) =>
      market
        ? {
            marketId,
            tvl: null,
            totalSupply: null,
            totalBorrow: null,
            volume24h: null,
            utilization: null,
            asOf: new Date(),
            source: SOURCE,
            reserves: market.reserves,
          }
        : null,
    );
  }
  override getUserPositions(network: Network, account: string) {
    return this.provider.getPositions?.(network, account) ?? Promise.resolve([]);
  }
  override getYieldMetrics(network: Network) {
    return this.provider.getYield?.(network) ?? Promise.resolve([]);
  }
  override getRiskMetrics(network: Network, account?: string) {
    return account && this.provider.getRisk
      ? this.provider.getRisk(network, account)
      : Promise.resolve([]);
  }
  override buildDepositLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.action('addLiquidity', request);
  }
  override buildWithdrawLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.action('removeLiquidity', request);
  }
  override buildClaimTransaction(request: ProtocolTransactionRequest) {
    return this.action('collectFees', request);
  }
  override buildSwapTransaction(request: ProtocolTransactionRequest) {
    return this.action('swap', request);
  }
  getQuote(request: import('./quote-source').QuoteRequest) {
    if (!this.provider.quote)
      return Promise.reject(
        new SushiDataUnavailableError('Sushi quote interface is not configured'),
      );
    return this.provider.quote(request);
  }
  private action(
    operation: 'addLiquidity' | 'removeLiquidity' | 'collectFees' | 'swap',
    request: ProtocolTransactionRequest,
  ) {
    if (!this.provider.buildTransaction)
      throw new SushiDataUnavailableError('Sushi transaction interface is not configured');
    return this.provider.buildTransaction(operation, request);
  }
}

export type SushiAssetPair = { token0: AssetId; token1: AssetId; feeTier: string | null };
