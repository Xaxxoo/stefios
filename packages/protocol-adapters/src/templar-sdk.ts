import type { Network } from '@sfo/shared';
import { BaseProtocolAdapter } from './adapter';
import type {
  ProtocolCapabilities,
  ProtocolMarket,
  ProtocolMarketMetrics,
  ProtocolPosition,
  ProtocolRiskMetrics,
  ProtocolTransactionRequest,
  ProtocolYieldMetrics,
  UnsignedProtocolTransaction,
} from './types';

const SOURCE = '@templar/stellar-chain-abstraction-boundary';

export type TemplarLifecycleState =
  | 'awaiting_collateral'
  | 'collateral_pending'
  | 'collateralized'
  | 'borrow_pending'
  | 'active'
  | 'repay_pending'
  | 'withdrawal_pending'
  | 'completed'
  | 'failed'
  | 'liquidatable'
  | 'expired'
  | 'unknown';

export type TemplarPosition = ProtocolPosition & {
  ltv: string | null;
  liquidationThreshold: string | null;
  health: string | null;
  borrowRate: string | null;
  positionStatus: string | null;
  lifecycleState: TemplarLifecycleState;
  operationId: string | null;
};
export type TemplarPreparedTransaction = UnsignedProtocolTransaction & {
  status: 'simulated';
  transactionXdr: string;
  preview: {
    title: string;
    summary: string;
    warnings: readonly string[];
    simulation: { status: 'success' | 'failed'; error?: string };
  };
  lifecycleState: TemplarLifecycleState;
  operationId: string | null;
};
export type TemplarProviderStatus = {
  status: 'available' | 'unavailable';
  source: string;
  reason: string | null;
  checkedAt: Date;
};
export type TemplarProvider = {
  status(network: Network): Promise<TemplarProviderStatus>;
  discoverMarkets(network: Network): Promise<readonly ProtocolMarket[]>;
  getPositions?(network: Network, account: string): Promise<readonly TemplarPosition[]>;
  getYield?(network: Network): Promise<readonly ProtocolYieldMetrics[]>;
  getRisk?(network: Network, account: string): Promise<readonly ProtocolRiskMetrics[]>;
  buildTransaction?(
    operation: 'depositCollateral' | 'withdrawCollateral' | 'borrow' | 'repay',
    request: ProtocolTransactionRequest,
  ): Promise<TemplarPreparedTransaction>;
};

export class TemplarDataUnavailableError extends Error {
  constructor(message = 'No verified Stellar-facing Templar provider is configured') {
    super(message);
    this.name = 'TemplarDataUnavailableError';
  }
}

export class UnavailableTemplarProvider implements TemplarProvider {
  async status(): Promise<TemplarProviderStatus> {
    return {
      status: 'unavailable',
      source: SOURCE,
      reason:
        'Templar market contracts and documented operations are NEAR-based; no supported Stellar-facing provider is configured',
      checkedAt: new Date(),
    };
  }
  async discoverMarkets(): Promise<readonly ProtocolMarket[]> {
    throw new TemplarDataUnavailableError();
  }
  async getPositions(): Promise<readonly TemplarPosition[]> {
    throw new TemplarDataUnavailableError();
  }
  async getYield(): Promise<readonly ProtocolYieldMetrics[]> {
    throw new TemplarDataUnavailableError();
  }
  async getRisk(): Promise<readonly ProtocolRiskMetrics[]> {
    throw new TemplarDataUnavailableError();
  }
  async buildTransaction(): Promise<TemplarPreparedTransaction> {
    throw new TemplarDataUnavailableError(
      'Templar actions are disabled until a verified Stellar-facing lifecycle provider is configured',
    );
  }
}

export class TemplarSdkAdapter extends BaseProtocolAdapter {
  readonly id = 'templar' as const;
  readonly name = 'Templar';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'supply',
    'withdraw',
    'borrow',
    'repay',
  );

  constructor(private readonly provider: TemplarProvider) {
    super();
  }
  status(network: Network) {
    return this.provider.status(network);
  }
  override discoverMarkets(network: Network) {
    return this.provider.discoverMarkets(network);
  }
  override getMarket(network: Network, marketId: string) {
    return this.provider
      .discoverMarkets(network)
      .then((markets) => markets.find((market) => market.id === marketId) ?? null);
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
  override buildSupplyTransaction(request: ProtocolTransactionRequest) {
    return this.action('depositCollateral', request);
  }
  override buildWithdrawTransaction(request: ProtocolTransactionRequest) {
    return this.action('withdrawCollateral', request);
  }
  override buildBorrowTransaction(request: ProtocolTransactionRequest) {
    return this.action('borrow', request);
  }
  override buildRepayTransaction(request: ProtocolTransactionRequest) {
    return this.action('repay', request);
  }
  private action(
    operation: 'depositCollateral' | 'withdrawCollateral' | 'borrow' | 'repay',
    request: ProtocolTransactionRequest,
  ) {
    if (!this.provider.buildTransaction)
      throw new TemplarDataUnavailableError('Templar transaction interface is not configured');
    return this.provider.buildTransaction(operation, request);
  }
}
