import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type Redis from 'ioredis';
import type { Repository } from 'typeorm';
import { Asset, RwaMetadata } from '../../database/entities/assets.entity';
import { REDIS } from '../../infrastructure/redis.module';
import {
  canonicalAssetId,
  parseCanonicalAssetId,
  type CanonicalAssetInput,
} from '../assets/asset-identity';

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = 'sfo:rwa:';

function safeUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

export interface RwaResponse {
  assetId: string;
  network: string;
  assetType: string;
  assetCode: string | null;
  contractAddress: string | null;
  issuer: string | null;
  manager: string | null;
  productName: string | null;
  instrumentType: string | null;
  jurisdiction: string | null;
  denomination: string | null;
  underlyingAssetCategory: string | null;
  nav: string | null;
  navTimestamp: Date | null;
  indicatedYield: string | null;
  yieldTimestamp: Date | null;
  maturity: Date | null;
  duration: string | null;
  transferRestrictions: string | null;
  eligibilityRequirements: string | null;
  officialUrl: string | null;
  disclosuresUrl: string | null;
  source: string | null;
  freshness: Date | null;
  verification: 'verified' | 'unverified' | 'unknown';
}

@Injectable()
export class RwaService {
  constructor(
    @InjectRepository(RwaMetadata) private readonly rwas: Repository<RwaMetadata>,
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async list(network?: 'testnet' | 'mainnet', limit = 50): Promise<readonly RwaResponse[]> {
    const safeLimit = Math.min(Math.max(limit, 1), 100);
    const cacheKey = `${CACHE_PREFIX}list:${network ?? 'all'}:${safeLimit}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as readonly RwaResponse[];
    const builder = this.rwas
      .createQueryBuilder('rwa')
      .innerJoinAndSelect('rwa.asset', 'asset')
      .orderBy('rwa.updatedAt', 'DESC')
      .take(safeLimit);
    if (network) builder.andWhere('asset.network = :network', { network });
    const result = await Promise.all((await builder.getMany()).map((rwa) => this.toResponse(rwa)));
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  async get(assetId: string): Promise<RwaResponse> {
    const input = this.parse(assetId);
    const key = canonicalAssetId(input);
    const cacheKey = `${CACHE_PREFIX}${key}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as RwaResponse;
    const rwa = await this.rwas
      .createQueryBuilder('rwa')
      .innerJoinAndSelect('rwa.asset', 'asset')
      .where('asset.network = :network', { network: input.network })
      .andWhere('asset.assetType = :assetType', { assetType: input.type })
      .andWhere(
        input.type === 'native'
          ? 'asset.id IS NOT NULL'
          : input.type === 'classic'
            ? 'asset.assetCode = :assetCode AND asset.issuerAddress = :issuerAddress'
            : 'asset.contractAddress = :contractAddress',
        {
          assetCode: input.assetCode,
          issuerAddress: input.issuerAddress,
          contractAddress: input.contractAddress,
        },
      )
      .getOne();
    if (!rwa) throw new NotFoundException('RWA metadata not found for canonical asset');
    const result = await this.toResponse(rwa);
    await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  private parse(assetId: string): CanonicalAssetInput {
    try {
      return parseCanonicalAssetId(assetId);
    } catch {
      throw new BadRequestException('Invalid canonical asset identity');
    }
  }

  private async toResponse(rwa: RwaMetadata): Promise<RwaResponse> {
    const asset = rwa.asset;
    const input: CanonicalAssetInput = {
      network: asset.network as 'testnet' | 'mainnet',
      type: asset.assetType,
      ...(asset.assetCode ? { assetCode: asset.assetCode } : {}),
      ...(asset.issuerAddress ? { issuerAddress: asset.issuerAddress } : {}),
      ...(asset.contractAddress ? { contractAddress: asset.contractAddress } : {}),
    };
    return {
      assetId: canonicalAssetId(input),
      network: asset.network,
      assetType: asset.assetType,
      assetCode: asset.assetCode,
      contractAddress: asset.contractAddress,
      issuer: asset.issuerAddress ?? rwa.issuerName,
      manager: rwa.manager,
      productName: rwa.productName,
      instrumentType: rwa.instrumentType,
      jurisdiction: rwa.jurisdiction,
      denomination: rwa.denomination,
      underlyingAssetCategory: rwa.underlyingAssetCategory,
      nav: rwa.nav,
      navTimestamp: rwa.navTimestamp,
      indicatedYield: rwa.indicatedYield,
      yieldTimestamp: rwa.yieldTimestamp,
      maturity: rwa.maturity,
      duration: rwa.duration,
      transferRestrictions: rwa.transferRestrictions,
      eligibilityRequirements: rwa.eligibilityRequirements,
      officialUrl: safeUrl(rwa.officialUrl),
      disclosuresUrl: safeUrl(rwa.disclosuresUrl),
      source: rwa.source,
      freshness: rwa.freshness,
      verification: rwa.verification ?? 'unknown',
    };
  }
}
