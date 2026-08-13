import { Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { PriceProvider, PriceProviderContext, NormalizedPriceQuote } from './price-providers';

type ConfiguredStablecoin = {
  assetId: string;
  quoteCurrency?: string;
  price: string;
  confidence?: string;
};

@Injectable()
export class ConfiguredStablecoinPriceProvider implements PriceProvider {
  readonly id = 'configured-stablecoin' as const;
  readonly priority = 10;
  private readonly entries: readonly ConfiguredStablecoin[];

  constructor(config: ConfigService) {
    const raw = config.get<string>('app.stablecoinPricesJson');
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      this.entries = Array.isArray(parsed)
        ? parsed.filter(
            (item): item is ConfiguredStablecoin =>
              typeof item?.assetId === 'string' && typeof item?.price === 'string',
          )
        : [];
    } catch {
      this.entries = [];
    }
  }

  async getQuote(context: PriceProviderContext): Promise<NormalizedPriceQuote | null> {
    const entry = this.entries.find(
      (candidate) =>
        candidate.assetId === context.assetId &&
        (candidate.quoteCurrency ?? 'USD') === context.quoteCurrency,
    );
    if (!entry) return null;
    return {
      asset: context.assetId,
      quoteCurrency: context.quoteCurrency,
      price: entry.price,
      timestamp: new Date().toISOString(),
      source: this.id,
      confidence: entry.confidence ?? '1',
      stale: false,
    };
  }
}
