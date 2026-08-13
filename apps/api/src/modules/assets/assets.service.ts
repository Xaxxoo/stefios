import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { StellarToml } from '@stellar/stellar-sdk';
import type Redis from 'ioredis';
import type { Repository } from 'typeorm';
import { Asset, AssetIssuer, AssetMetadata } from '../../database/entities';
import { REDIS } from '../../infrastructure/redis.module';
import { STELLAR_RPC_PROVIDER } from '../stellar/stellar.module';
import type { StellarAccountProvider, StellarRpcProvider } from '@sfo/stellar';
import {
  assetLookupKey,
  canonicalAssetId,
  parseCanonicalAssetId,
  type CanonicalAssetInput,
} from './asset-identity';
import { sanitizeAssetMetadata, type SanitizedAssetMetadata } from './metadata';
import { CURATED_ASSETS } from './registry';

const CACHE_TTL_SECONDS = 300;
const CACHE_PREFIX = 'sfo:assets:';

export interface AssetResponse extends SanitizedAssetMetadata {
  assetId: string;
  network: string;
  type: string;
  decimals: string;
}

@Injectable()
export class AssetsService {
  constructor(
    @InjectRepository(Asset) private readonly assets: Repository<Asset>,
    @InjectRepository(AssetIssuer) private readonly issuers: Repository<AssetIssuer>,
    @InjectRepository(AssetMetadata) private readonly metadata: Repository<AssetMetadata>,
    @Inject(STELLAR_RPC_PROVIDER)
    private readonly stellar: StellarRpcProvider & StellarAccountProvider,
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async list(query: {
    network?: 'testnet' | 'mainnet';
    category?: string;
    limit?: number;
    cursor?: string;
  }): Promise<readonly AssetResponse[]> {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 100);
    const cacheKey = `${CACHE_PREFIX}list:${JSON.stringify({ network: query.network, category: query.category, limit })}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as readonly AssetResponse[];
    const queryBuilder = this.assets
      .createQueryBuilder('asset')
      .orderBy('asset.createdAt', 'DESC')
      .take(limit);
    if (query.network)
      queryBuilder.andWhere('asset.network = :network', { network: query.network });
    const assets = await queryBuilder.getMany();
    const responses = await Promise.all(assets.map((asset) => this.toResponse(asset)));
    const filtered = query.category
      ? responses.filter((asset) => asset.category === query.category)
      : responses;
    await this.redis.set(cacheKey, JSON.stringify(filtered), 'EX', CACHE_TTL_SECONDS);
    return filtered;
  }

  async search(q: string, network?: 'testnet' | 'mainnet'): Promise<readonly AssetResponse[]> {
    const term = q.trim().slice(0, 80);
    if (!term) return [];
    const cacheKey = `${CACHE_PREFIX}search:${network ?? 'all'}:${term.toLowerCase()}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as readonly AssetResponse[];
    const builder = this.assets
      .createQueryBuilder('asset')
      .where(
        '(asset.assetCode ILIKE :term OR asset.contractAddress ILIKE :term OR asset.issuerAddress ILIKE :term)',
        { term: `%${term}%` },
      )
      .take(50);
    if (network) builder.andWhere('asset.network = :network', { network });
    const results = await Promise.all(
      (await builder.getMany()).map((asset) => this.toResponse(asset)),
    );
    await this.redis.set(cacheKey, JSON.stringify(results), 'EX', CACHE_TTL_SECONDS);
    return results;
  }

  async get(assetId: string): Promise<AssetResponse> {
    const input = this.parse(assetId);
    const cacheKey = `${CACHE_PREFIX}${canonicalAssetId(input)}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return JSON.parse(cached) as AssetResponse;
    let asset = await this.assets.findOne({ where: assetLookupKey(input) as never });
    if (!asset) asset = await this.discover(input);
    if (!asset) throw new NotFoundException('Asset not found');
    const response = await this.toResponse(asset);
    await this.redis.set(cacheKey, JSON.stringify(response), 'EX', CACHE_TTL_SECONDS);
    return response;
  }

  async getMetadata(assetId: string): Promise<AssetResponse> {
    return this.get(assetId);
  }

  private parse(assetId: string): CanonicalAssetInput {
    try {
      return parseCanonicalAssetId(assetId);
    } catch {
      throw new BadRequestException('Invalid canonical asset identity');
    }
  }

  private async discover(input: CanonicalAssetInput): Promise<Asset | null> {
    const curated = CURATED_ASSETS.find(
      (entry) => canonicalAssetId(entry) === canonicalAssetId(input),
    );
    const existing = await this.assets.findOne({ where: assetLookupKey(input) as never });
    if (existing) return existing;
    const asset = this.assets.create({
      ...assetLookupKey(input),
      decimals: input.type === 'native' ? '7' : '18',
      providerMetadata: curated ? { curated: true } : null,
    } as Asset);
    if (input.issuerAddress) {
      const issuer = await this.issuers.findOne({
        where: { network: input.network, issuerAddress: input.issuerAddress },
      });
      if (issuer) asset.issuerId = issuer.id;
      else {
        const createdIssuer = await this.issuers.save(
          this.issuers.create({
            network: input.network,
            issuerAddress: input.issuerAddress,
            name: null,
            providerMetadata: null,
          }),
        );
        asset.issuerId = createdIssuer.id;
      }
    }
    return this.assets.save(asset);
  }

  private async toResponse(asset: Asset): Promise<AssetResponse> {
    const input: CanonicalAssetInput = {
      network: asset.network as 'testnet' | 'mainnet',
      type: asset.assetType,
      ...(asset.assetCode ? { assetCode: asset.assetCode } : {}),
      ...(asset.issuerAddress ? { issuerAddress: asset.issuerAddress } : {}),
      ...(asset.contractAddress ? { contractAddress: asset.contractAddress } : {}),
    };
    const curated = CURATED_ASSETS.find(
      (entry) => canonicalAssetId(entry) === canonicalAssetId(input),
    );
    const rows = await this.metadata.find({ where: { assetId: asset.id } });
    const raw = Object.fromEntries(rows.map((row) => [row.key, row.value]));
    let verified = false;
    let domain: string | undefined;
    if (asset.issuerAddress) {
      const issuer = await this.issuers.findOne({ where: { id: asset.issuerId ?? '' } });
      domain =
        typeof issuer?.providerMetadata?.domain === 'string'
          ? issuer.providerMetadata.domain
          : undefined;
      if (!domain) {
        try {
          const account = await this.stellar.getAccount(asset.issuerAddress);
          const raw = account.raw as { homeDomain?: string; home_domain?: string };
          domain = raw.homeDomain ?? raw.home_domain;
        } catch {
          /* issuer account metadata is optional */
        }
      }
      if (domain) {
        try {
          const toml = await StellarToml.Resolver.resolve(domain, {
            allowHttp: false,
            timeout: 3000,
          });
          const currency = toml.CURRENCIES?.find(
            (entry) => entry.code === asset.assetCode && entry.issuer === asset.issuerAddress,
          );
          if (currency) {
            Object.assign(raw, currency);
            verified = true;
          }
        } catch {
          /* unavailable metadata is not an error */
        }
      }
    }
    const sanitized = sanitizeAssetMetadata(
      { ...curated, ...raw },
      {
        issuer: asset.issuerAddress ?? undefined,
        contract: asset.contractAddress ?? undefined,
        domain,
      },
      verified,
    );
    return {
      assetId: canonicalAssetId(input),
      network: asset.network,
      type: asset.assetType,
      decimals: asset.decimals,
      ...sanitized,
    };
  }
}
