import type { CanonicalAssetInput } from './asset-identity';

export type CuratedAsset = CanonicalAssetInput & {
  symbol: string;
  name: string;
  category: string;
  domain?: string;
  officialLinks?: readonly string[];
};

// Curated entries are identity-bound hints. They never verify an asset by symbol alone.
export const CURATED_ASSETS: readonly CuratedAsset[] = [];
