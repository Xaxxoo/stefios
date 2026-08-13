import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import type { Repository } from 'typeorm';
import {
  AccountBalance,
  BorrowPosition,
  LendingPosition,
  LiquidityPosition,
  PortfolioPosition,
  PortfolioSnapshot,
  ProtocolPosition,
  RewardPosition,
  StellarAccount,
} from '../../database/entities';
import type { Asset } from '../../database/entities';
import { REDIS } from '../../infrastructure/redis.module';
import { PricesService } from '../prices/prices.service';
import { aggregatePortfolio, type PortfolioAssetInput } from './aggregation';

@Injectable()
export class PortfolioService {
  constructor(
    @InjectRepository(StellarAccount) private readonly accounts: Repository<StellarAccount>,
    @InjectRepository(AccountBalance) private readonly balances: Repository<AccountBalance>,
    @InjectRepository(ProtocolPosition)
    private readonly protocolPositions: Repository<ProtocolPosition>,
    @InjectRepository(LendingPosition) private readonly lending: Repository<LendingPosition>,
    @InjectRepository(BorrowPosition) private readonly borrow: Repository<BorrowPosition>,
    @InjectRepository(LiquidityPosition) private readonly liquidity: Repository<LiquidityPosition>,
    @InjectRepository(RewardPosition) private readonly rewards: Repository<RewardPosition>,
    @InjectRepository(PortfolioSnapshot) private readonly snapshots: Repository<PortfolioSnapshot>,
    @InjectRepository(PortfolioPosition) private readonly positions: Repository<PortfolioPosition>,
    @Inject(PricesService) private readonly prices: PricesService,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async get(address: string, network: 'testnet' | 'mainnet' = 'testnet') {
    const account = await this.accounts.findOne({ where: { accountAddress: address, network } });
    if (!account) throw new NotFoundException('Wallet account not found');
    const cacheKey = `sfo:portfolio:${network}:${address}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached);
    const rows = await this.balances.find({
      where: { accountId: account.id },
      relations: ['asset'],
    });
    const inputs: PortfolioAssetInput[] = await Promise.all(
      rows.map(async (row) => this.assetInput(row.asset, row.amount, true)),
    );
    const protocolRows = await this.protocolPositions.find({
      where: { accountId: account.id },
      relations: ['protocol'],
    });
    inputs.push(
      ...(await Promise.all(
        protocolRows.map(async (row) =>
          this.assetInput(
            null,
            row.value,
            false,
            row.protocol?.name ?? 'protocol',
            row.providerMetadata,
          ),
        ),
      )),
    );
    const lendingRows = await this.lending.find({ where: { accountId: account.id } });
    inputs.push(
      ...(await Promise.all(
        lendingRows.map(async (row) =>
          this.assetInput(null, row.value, false, 'lending', row.providerMetadata, true),
        ),
      )),
    );
    const liquidityRows = await this.liquidity.find({ where: { accountId: account.id } });
    inputs.push(
      ...(await Promise.all(
        liquidityRows.map(async (row) =>
          this.assetInput(null, row.value, false, 'liquidity', row.providerMetadata, true),
        ),
      )),
    );
    const rewardRows = await this.rewards.find({ where: { accountId: account.id } });
    inputs.push(
      ...(await Promise.all(
        rewardRows.map(async (row) =>
          this.assetInput(null, row.value, false, 'rewards', row.providerMetadata),
        ),
      )),
    );
    const debtRows = await this.borrow.find({ where: { accountId: account.id } });
    const result = aggregatePortfolio(
      inputs,
      debtRows.map((row) => ({
        id: row.id,
        protocol: 'borrowing',
        value: row.value,
        source: this.metadataString(row.providerMetadata, 'source'),
        freshness: this.metadataString(row.providerMetadata, 'freshness'),
      })),
    );
    const snapshot = await this.snapshots.save(
      this.snapshots.create({
        accountId: account.id,
        snapshotAt: new Date(),
        totalValue: result.netPortfolioValue,
        totalCostBasis: '0',
        quoteCurrency: 'USD',
        providerMetadata: { freshness: result.freshness },
      }),
    );
    for (const row of result.byAsset) {
      if (row.value !== null && this.isUuid(row.asset)) {
        await this.positions.upsert(
          {
            snapshotId: snapshot.id,
            assetId: row.asset,
            quantity: '0',
            value: row.value,
            costBasis: '0',
          },
          ['snapshotId', 'assetId'],
        );
      }
    }
    const response = { address, network, ...result, asOf: snapshot.snapshotAt };
    await this.redis.set(cacheKey, JSON.stringify(response), 'EX', 30);
    return response;
  }

  async allocation(address: string, network: 'testnet' | 'mainnet' = 'testnet') {
    const portfolio = await this.get(address, network);
    return {
      address,
      network,
      byAsset: portfolio.byAsset,
      byCategory: portfolio.byCategory,
      byProtocol: portfolio.byProtocol,
      freshness: portfolio.freshness,
    };
  }
  async history(address: string, network: 'testnet' | 'mainnet' = 'testnet', limit = 90) {
    const account = await this.accounts.findOne({ where: { accountAddress: address, network } });
    if (!account) throw new NotFoundException('Wallet account not found');
    return this.snapshots.find({
      where: { accountId: account.id },
      order: { snapshotAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 365),
      select: {
        id: true,
        snapshotAt: true,
        totalValue: true,
        quoteCurrency: true,
        providerMetadata: true,
      },
    });
  }

  private async assetInput(
    asset: Asset | null,
    amount: string,
    isWalletBalance: boolean,
    protocol?: string,
    metadata?: Record<string, unknown> | null,
    yieldBearing = false,
  ): Promise<PortfolioAssetInput> {
    const assetId = asset
      ? this.assetIdentity(asset)
      : `protocol:${protocol ?? 'unknown'}:${amount}`;
    const quote = asset ? await this.prices.get(assetId) : null;
    const provider = metadata ?? {};
    return {
      assetId,
      symbol: asset?.assetCode,
      category:
        typeof provider.category === 'string'
          ? provider.category
          : typeof asset?.providerMetadata?.category === 'string'
            ? asset.providerMetadata.category
            : protocol
              ? 'defi'
              : 'other',
      protocol,
      quantity: amount,
      price: quote,
      prevaluedValue: asset ? null : amount,
      valuationSource: asset
        ? null
        : (this.metadataString(provider, 'source') ?? `${protocol ?? 'protocol'}-position`),
      valuationTimestamp: asset ? null : this.metadataString(provider, 'timestamp'),
      valuationStale: asset ? false : provider.stale === true,
      isWalletBalance,
      isYieldBearing: yieldBearing,
      apy: this.metadataString(provider, 'apy'),
      custodyKey: isWalletBalance ? assetId : this.metadataString(provider, 'underlyingAssetId'),
    };
  }
  private assetIdentity(asset: Asset) {
    if (asset.assetType === 'native') return `${asset.network}:native`;
    if (asset.assetType === 'classic')
      return `${asset.network}:classic:${encodeURIComponent(asset.assetCode!)}:${asset.issuerAddress}`;
    return `${asset.network}:contract:${asset.contractAddress}`;
  }
  private metadataString(metadata: Record<string, unknown> | null | undefined, key: string) {
    return typeof metadata?.[key] === 'string' ? (metadata[key] as string) : null;
  }
  private isUuid(value: string) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
  }
}
