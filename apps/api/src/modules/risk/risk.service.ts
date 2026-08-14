import { Injectable } from '@nestjs/common';
import Decimal from 'decimal.js';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { RwaMetadata } from '../../database/entities';
import { canonicalAssetId } from '../assets/asset-identity';
import type { PortfolioService } from '../portfolio/portfolio.service';
import type { ProtocolsService } from '../protocols/protocols.service';
import { calculatePortfolioRisk } from './risk-calculation';

@Injectable()
export class RiskService {
  constructor(
    private readonly portfolio: PortfolioService,
    private readonly protocols: ProtocolsService,
    @InjectRepository(RwaMetadata) private readonly rwas: Repository<RwaMetadata>,
  ) {}

  async get(address: string, network: 'mainnet' | 'testnet' = 'testnet') {
    const [portfolio, defi] = await Promise.all([
      this.portfolio.get(address, network),
      this.protocols.defi(network, address),
    ]);
    const rwaRows = await this.rwas.find({ where: { asset: { network } }, relations: ['asset'] });
    const portfolioValues = new Map<string, string>();
    for (const row of portfolio.byAsset as readonly { asset: string; value: string | null }[]) {
      if (row.value !== null) portfolioValues.set(row.asset, row.value);
    }
    const managerValues = new Map<string, Decimal>();
    for (const row of rwaRows) {
      if (!row.manager || !row.asset) continue;
      const assetId = canonicalAssetId({
        network: assetNetwork(row.asset.network),
        type: row.asset.assetType,
        assetCode: row.asset.assetCode ?? undefined,
        issuerAddress: row.asset.issuerAddress ?? undefined,
        contractAddress: row.asset.contractAddress ?? undefined,
      });
      const value = portfolioValues.get(assetId);
      if (value !== undefined) {
        const current = managerValues.get(row.manager) ?? new Decimal(0);
        managerValues.set(row.manager, current.plus(value));
      }
    }
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
      rwaManagers: [...managerValues.entries()].map(([manager, value]) => ({
        manager,
        value: value.toFixed(),
      })),
    });
  }
}

function assetNetwork(value: string): 'testnet' | 'mainnet' {
  return value === 'mainnet' ? 'mainnet' : 'testnet';
}
