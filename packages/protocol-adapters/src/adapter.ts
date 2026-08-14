import type { Network } from '@sfo/shared';
import type {
  ProtocolDataSource,
  ProtocolCapabilities,
  ProtocolId,
  ProtocolMarket,
  ProtocolMarketMetrics,
  ProtocolOperation,
  ProtocolPosition,
  ProtocolRiskMetrics,
  ProtocolTransactionRequest,
  ProtocolYieldMetrics,
  UnsignedProtocolTransaction,
} from './types';

export class UnsupportedProtocolOperationError extends Error {
  constructor(
    public readonly protocol: ProtocolId,
    public readonly operation: ProtocolOperation,
  ) {
    super(`${protocol} does not support ${operation}`);
    this.name = 'UnsupportedProtocolOperationError';
  }
}

export class ProtocolDataUnavailableError extends Error {
  constructor(
    public readonly protocol: ProtocolId,
    public readonly capability: string,
  ) {
    super(`${protocol} ${capability} data is unavailable`);
    this.name = 'ProtocolDataUnavailableError';
  }
}

export interface ProtocolAdapter {
  readonly id: ProtocolId;
  readonly name: string;
  readonly networks: readonly Network[];
  readonly capabilities: ProtocolCapabilities;
  discoverMarkets(network: Network): Promise<readonly ProtocolMarket[]>;
  getMarket(network: Network, marketId: string): Promise<ProtocolMarket | null>;
  getMarketMetrics(network: Network, marketId: string): Promise<ProtocolMarketMetrics | null>;
  getUserPositions(network: Network, account: string): Promise<readonly ProtocolPosition[]>;
  getYieldMetrics(network: Network): Promise<readonly ProtocolYieldMetrics[]>;
  getRiskMetrics(network: Network, account?: string): Promise<readonly ProtocolRiskMetrics[]>;
  buildSupplyTransaction(request: ProtocolTransactionRequest): Promise<UnsignedProtocolTransaction>;
  buildWithdrawTransaction(
    request: ProtocolTransactionRequest,
  ): Promise<UnsignedProtocolTransaction>;
  buildBorrowTransaction(request: ProtocolTransactionRequest): Promise<UnsignedProtocolTransaction>;
  buildRepayTransaction(request: ProtocolTransactionRequest): Promise<UnsignedProtocolTransaction>;
  buildDepositLiquidityTransaction(
    request: ProtocolTransactionRequest,
  ): Promise<UnsignedProtocolTransaction>;
  buildWithdrawLiquidityTransaction(
    request: ProtocolTransactionRequest,
  ): Promise<UnsignedProtocolTransaction>;
  buildClaimTransaction(request: ProtocolTransactionRequest): Promise<UnsignedProtocolTransaction>;
  buildSwapTransaction(request: ProtocolTransactionRequest): Promise<UnsignedProtocolTransaction>;
}

const EMPTY_CAPABILITIES: ProtocolCapabilities = {
  supply: false,
  withdraw: false,
  borrow: false,
  repay: false,
  depositLiquidity: false,
  withdrawLiquidity: false,
  claim: false,
  swap: false,
};

export abstract class BaseProtocolAdapter implements ProtocolAdapter {
  abstract readonly id: ProtocolId;
  abstract readonly name: string;
  readonly networks: readonly Network[] = ['mainnet', 'testnet'];
  abstract readonly capabilities: ProtocolCapabilities;

  constructor(protected readonly source: ProtocolDataSource = {}) {}

  discoverMarkets(network: Network) {
    return this.read(
      'discoverMarkets',
      () => this.source.discoverMarkets?.(this.id, network) ?? Promise.resolve([]),
    );
  }
  getMarket(network: Network, marketId: string) {
    return this.read(
      'getMarket',
      () => this.source.getMarket?.(this.id, network, marketId) ?? Promise.resolve(null),
    );
  }
  getMarketMetrics(network: Network, marketId: string) {
    return this.read(
      'getMarketMetrics',
      () => this.source.getMarketMetrics?.(this.id, network, marketId) ?? Promise.resolve(null),
    );
  }
  getUserPositions(network: Network, account: string) {
    return this.read(
      'getUserPositions',
      () => this.source.getUserPositions?.(this.id, network, account) ?? Promise.resolve([]),
    );
  }
  getYieldMetrics(network: Network) {
    return this.read(
      'getYieldMetrics',
      () => this.source.getYieldMetrics?.(this.id, network) ?? Promise.resolve([]),
    );
  }
  getRiskMetrics(network: Network, account?: string) {
    return this.read(
      'getRiskMetrics',
      () => this.source.getRiskMetrics?.(this.id, network, account) ?? Promise.resolve([]),
    );
  }

  buildSupplyTransaction(request: ProtocolTransactionRequest) {
    return this.build('supply', request);
  }
  buildWithdrawTransaction(request: ProtocolTransactionRequest) {
    return this.build('withdraw', request);
  }
  buildBorrowTransaction(request: ProtocolTransactionRequest) {
    return this.build('borrow', request);
  }
  buildRepayTransaction(request: ProtocolTransactionRequest) {
    return this.build('repay', request);
  }
  buildDepositLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.build('depositLiquidity', request);
  }
  buildWithdrawLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.build('withdrawLiquidity', request);
  }
  buildClaimTransaction(request: ProtocolTransactionRequest) {
    return this.build('claim', request);
  }
  buildSwapTransaction(request: ProtocolTransactionRequest) {
    return this.build('swap', request);
  }

  private async read<T>(capability: string, operation: () => Promise<T>): Promise<T> {
    if (!this.source[capability as keyof ProtocolDataSource])
      throw new ProtocolDataUnavailableError(this.id, capability);
    return operation();
  }

  private async build(
    operation: ProtocolOperation,
    request: ProtocolTransactionRequest,
  ): Promise<UnsignedProtocolTransaction> {
    if (!this.capabilities[operation])
      throw new UnsupportedProtocolOperationError(this.id, operation);
    const transaction: UnsignedProtocolTransaction = {
      protocol: this.id,
      operation,
      network: request.network,
      sourceAccount: request.account,
      marketId: request.marketId ?? null,
      asset: request.asset ?? null,
      amount: request.amount ?? null,
      quoteAsset: request.quoteAsset ?? null,
      minReceived: request.minReceived ?? null,
      slippageBps: request.slippageBps ?? null,
      destination: request.destination ?? null,
      positionId: request.positionId ?? null,
      requiredSigners: [request.account],
      status: 'unsigned',
    };
    if (!this.source.buildTransaction) return transaction;
    return this.source.buildTransaction(transaction);
  }

  protected static capabilities(...supported: ProtocolOperation[]): ProtocolCapabilities {
    return {
      ...EMPTY_CAPABILITIES,
      ...Object.fromEntries(supported.map((operation) => [operation, true])),
    } as ProtocolCapabilities;
  }
}
