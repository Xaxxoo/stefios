import { Injectable } from '@nestjs/common';
import { PortfolioService } from '../portfolio/portfolio.service';
import { ProtocolsService } from '../protocols/protocols.service';
import { calculatePortfolioRisk } from './risk-calculation';

@Injectable()
export class RiskService {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly protocols: ProtocolsService,
  ) {}

  async get(address: string, network: 'mainnet' | 'testnet' = 'testnet') {
    const [portfolio, defi] = await Promise.all([
      this.portfolio.get(address, network),
      this.protocols.defi(network, address),
    ]);
    return calculatePortfolioRisk({
      grossAssetValue: portfolio.grossAssetValue,
      liabilities: portfolio.liabilities,
      availableLiquidity: portfolio.availableLiquidity,
      unpricedAssets: portfolio.unpricedAssets,
      freshness: portfolio.freshness,
      byAsset: portfolio.byAsset,
      byCategory: portfolio.byCategory,
      byProtocol: portfolio.byProtocol,
      positionHealth: defi.positionHealth,
    });
  }
}
