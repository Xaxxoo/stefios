import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import Decimal from 'decimal.js';
import { REDIS } from '../../infrastructure/redis.module';
import {
  canonicalAssetId,
  parseCanonicalAssetId,
  type CanonicalAssetInput,
} from '../assets/asset-identity';
import type { NormalizedPriceQuote, PriceProvider, PriceProviderContext } from './price-providers';

export const PRICE_PROVIDERS = Symbol('PRICE_PROVIDERS');
const CACHE_PREFIX = 'sfo:prices:';
const CACHE_TTL_SECONDS = 30;
const DEFAULT_MAX_AGE_MS = 5 * 60 * 1000;
const DECIMAL_PATTERN = /^(?:0|[1-9]\d*)(?:\.\d+)?$/;

@Injectable()
export class PricesService {
  constructor(
    @Inject(PRICE_PROVIDERS) private readonly providers: readonly PriceProvider[],
    @Inject(REDIS) private readonly redis: Redis,
  ) {}

  async get(assetId: string, quoteCurrency = 'USD'): Promise<NormalizedPriceQuote | null> {
    const input = this.parse(assetId);
    const canonical = canonicalAssetId(input);
    const currency = quoteCurrency.trim().toUpperCase().slice(0, 16);
    const cacheKey = `${CACHE_PREFIX}${canonical}:${currency}`;
    const cached = await this.redis.get(cacheKey);
    if (cached) return this.withFreshness(JSON.parse(cached) as NormalizedPriceQuote);
    const context: PriceProviderContext = {
      asset: input,
      assetId: canonical,
      quoteCurrency: currency,
    };
    const candidates: NormalizedPriceQuote[] = [];
    for (const provider of [...this.providers].sort((a, b) => a.priority - b.priority)) {
      try {
        const quote = await provider.getQuote(context);
        if (quote) {
          const normalized = this.normalizeQuote(quote, canonical, currency);
          candidates.push(normalized);
          if (!normalized.stale) break;
        }
      } catch {
        // A failed source is skipped so lower-priority sources can answer.
      }
    }
    const result = candidates[0] ?? null;
    if (result) await this.redis.set(cacheKey, JSON.stringify(result), 'EX', CACHE_TTL_SECONDS);
    return result;
  }

  async batch(
    assetIds: readonly string[],
    quoteCurrency = 'USD',
  ): Promise<readonly (NormalizedPriceQuote | null)[]> {
    return Promise.all(assetIds.map((assetId) => this.get(assetId, quoteCurrency)));
  }

  private parse(assetId: string): CanonicalAssetInput {
    try {
      return parseCanonicalAssetId(assetId);
    } catch {
      throw new BadRequestException('Invalid canonical asset identity');
    }
  }

  private normalizeQuote(
    quote: NormalizedPriceQuote,
    canonical: string,
    currency: string,
  ): NormalizedPriceQuote {
    let price: Decimal;
    let confidence: Decimal;
    try {
      price = new Decimal(quote.price);
      confidence = new Decimal(quote.confidence);
    } catch {
      throw new Error('Provider returned an invalid decimal quote');
    }
    if (
      !DECIMAL_PATTERN.test(quote.price) ||
      price.isNegative() ||
      !DECIMAL_PATTERN.test(quote.confidence) ||
      confidence.isNegative() ||
      confidence.gt(1)
    )
      throw new Error('Provider returned an invalid quote');
    const timestamp = new Date(quote.timestamp);
    if (Number.isNaN(timestamp.getTime()))
      throw new Error('Provider returned an invalid quote timestamp');
    return {
      asset: canonical,
      quoteCurrency: currency,
      price: price.toFixed(),
      timestamp: timestamp.toISOString(),
      source: quote.source,
      confidence: confidence.toFixed(),
      stale: quote.stale || Date.now() - timestamp.getTime() > DEFAULT_MAX_AGE_MS,
    };
  }

  private withFreshness(quote: NormalizedPriceQuote): NormalizedPriceQuote {
    const timestamp = new Date(quote.timestamp);
    return {
      ...quote,
      stale:
        quote.stale ||
        Number.isNaN(timestamp.getTime()) ||
        Date.now() - timestamp.getTime() > DEFAULT_MAX_AGE_MS,
    };
  }
}
