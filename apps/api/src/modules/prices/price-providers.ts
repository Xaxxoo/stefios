import type { CanonicalAssetInput } from '../assets/asset-identity';

export type PriceSource =
  'dex' | 'amm' | 'external-market-data' | 'rwa-nav' | 'configured-stablecoin' | string;

export interface NormalizedPriceQuote {
  asset: string;
  quoteCurrency: string;
  price: string;
  timestamp: string;
  source: PriceSource;
  confidence: string;
  stale: boolean;
}

export interface PriceProviderContext {
  asset: CanonicalAssetInput;
  assetId: string;
  quoteCurrency: string;
}

export interface PriceProvider {
  readonly id: PriceSource;
  readonly priority: number;
  getQuote(context: PriceProviderContext): Promise<NormalizedPriceQuote | null>;
}

export interface DexPricingProvider extends PriceProvider {
  readonly id: 'dex';
}
export interface AmmPricingProvider extends PriceProvider {
  readonly id: 'amm';
}
export interface ExternalMarketDataPricingProvider extends PriceProvider {
  readonly id: 'external-market-data';
}
export interface RwaNavPricingProvider extends PriceProvider {
  readonly id: 'rwa-nav';
}
