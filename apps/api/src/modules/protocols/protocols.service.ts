import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type {
  ProtocolRegistry,
  ProtocolTransactionRequest,
  QuoteRequest,
} from '@sfo/protocol-adapters';
import { PROTOCOL_REGISTRY } from './protocols.module';

@Injectable()
export class ProtocolsService {
  constructor(@Inject(PROTOCOL_REGISTRY) private readonly registry: ProtocolRegistry) {}

  private blend() {
    try {
      return this.registry.get('blend');
    } catch {
      throw new ServiceUnavailableException('Blend integration is not configured');
    }
  }

  private aquarius() {
    try {
      return this.registry.get('aquarius');
    } catch {
      throw new ServiceUnavailableException('Aquarius integration is not configured');
    }
  }
  private sushi() {
    try {
      return this.registry.get('sushi');
    } catch {
      throw new ServiceUnavailableException('Sushi integration is not configured');
    }
  }
  private templar() {
    try {
      return this.registry.get('templar');
    } catch {
      throw new ServiceUnavailableException('Templar integration is not configured');
    }
  }

  markets(network: 'mainnet' | 'testnet') {
    return this.blend().discoverMarkets(network);
  }
  market(network: 'mainnet' | 'testnet', marketId: string) {
    return this.blend().getMarket(network, marketId);
  }
  metrics(network: 'mainnet' | 'testnet', marketId: string) {
    return this.blend().getMarketMetrics(network, marketId);
  }
  positions(network: 'mainnet' | 'testnet', account: string) {
    return this.blend().getUserPositions(network, account);
  }
  yield(network: 'mainnet' | 'testnet') {
    return this.blend().getYieldMetrics(network);
  }
  risk(network: 'mainnet' | 'testnet', account: string) {
    return this.blend().getRiskMetrics(network, account);
  }
  aquariusMarkets(network: 'mainnet' | 'testnet') {
    return this.aquarius().discoverMarkets(network);
  }
  aquariusPositions(network: 'mainnet' | 'testnet', account: string) {
    return this.aquarius().getUserPositions(network, account);
  }
  aquariusYield(network: 'mainnet' | 'testnet') {
    return this.aquarius().getYieldMetrics(network);
  }
  aquariusQuote(request: QuoteRequest) {
    const quote = this.aquarius().getQuote;
    if (!quote) throw new ServiceUnavailableException('Aquarius quote source is not configured');
    return quote.call(this.aquarius(), request);
  }
  aquariusPrepare(operation: string, request: ProtocolTransactionRequest) {
    const adapter = this.aquarius();
    const builders: Record<string, (value: ProtocolTransactionRequest) => Promise<unknown>> = {
      swap: adapter.buildSwapTransaction.bind(adapter),
      depositLiquidity: adapter.buildDepositLiquidityTransaction.bind(adapter),
      withdrawLiquidity: adapter.buildWithdrawLiquidityTransaction.bind(adapter),
      claim: adapter.buildClaimTransaction.bind(adapter),
    };
    const builder = builders[operation];
    if (!builder)
      throw new ServiceUnavailableException(`Aquarius operation is not supported: ${operation}`);
    return builder(request);
  }
  sushiStatus(network: 'mainnet' | 'testnet') {
    const adapter = this.sushi();
    return 'status' in adapter && typeof adapter.status === 'function'
      ? adapter.status(network)
      : { status: 'unavailable', reason: 'Sushi status provider unavailable' };
  }
  sushiMarkets(network: 'mainnet' | 'testnet') {
    return this.sushi().discoverMarkets(network);
  }
  sushiPositions(network: 'mainnet' | 'testnet', account: string) {
    return this.sushi().getUserPositions(network, account);
  }
  sushiYield(network: 'mainnet' | 'testnet') {
    return this.sushi().getYieldMetrics(network);
  }
  sushiPrepare(operation: string, request: ProtocolTransactionRequest) {
    const adapter = this.sushi();
    const builders: Record<string, (value: ProtocolTransactionRequest) => Promise<unknown>> = {
      addLiquidity: adapter.buildDepositLiquidityTransaction.bind(adapter),
      removeLiquidity: adapter.buildWithdrawLiquidityTransaction.bind(adapter),
      collectFees: adapter.buildClaimTransaction.bind(adapter),
      swap: adapter.buildSwapTransaction.bind(adapter),
    };
    const builder = builders[operation];
    if (!builder)
      throw new ServiceUnavailableException(`Sushi operation is not supported: ${operation}`);
    return builder(request);
  }
  templarStatus(network: 'mainnet' | 'testnet') {
    const adapter = this.templar();
    return 'status' in adapter && typeof adapter.status === 'function'
      ? adapter.status(network)
      : { status: 'unavailable', reason: 'Templar status provider unavailable' };
  }
  templarMarkets(network: 'mainnet' | 'testnet') {
    return this.templar().discoverMarkets(network);
  }
  templarPositions(network: 'mainnet' | 'testnet', account: string) {
    return this.templar().getUserPositions(network, account);
  }
  templarRisk(network: 'mainnet' | 'testnet', account: string) {
    return this.templar().getRiskMetrics(network, account);
  }
  templarPrepare(operation: string, request: ProtocolTransactionRequest) {
    const adapter = this.templar();
    const builders: Record<string, (value: ProtocolTransactionRequest) => Promise<unknown>> = {
      depositCollateral: adapter.buildSupplyTransaction.bind(adapter),
      withdrawCollateral: adapter.buildWithdrawTransaction.bind(adapter),
      borrow: adapter.buildBorrowTransaction.bind(adapter),
      repay: adapter.buildRepayTransaction.bind(adapter),
    };
    const builder = builders[operation];
    if (!builder)
      throw new ServiceUnavailableException(`Templar operation is not supported: ${operation}`);
    return builder(request);
  }
  prepare(operation: string, request: ProtocolTransactionRequest) {
    const adapter = this.blend();
    const builders: Record<string, (value: ProtocolTransactionRequest) => Promise<unknown>> = {
      supply: adapter.buildSupplyTransaction.bind(adapter),
      withdraw: adapter.buildWithdrawTransaction.bind(adapter),
      borrow: adapter.buildBorrowTransaction.bind(adapter),
      repay: adapter.buildRepayTransaction.bind(adapter),
      claim: adapter.buildClaimTransaction.bind(adapter),
    };
    const builder = builders[operation];
    if (!builder)
      throw new ServiceUnavailableException(`Blend operation is not supported: ${operation}`);
    return builder(request);
  }
}
