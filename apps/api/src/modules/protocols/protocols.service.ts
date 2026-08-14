import { Inject, Injectable, ServiceUnavailableException } from '@nestjs/common';
import type { ProtocolRegistry, ProtocolTransactionRequest } from '@sfo/protocol-adapters';
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
