import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Asset detail',
  description: 'Canonical asset identity and source-aware metadata.',
};
export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <ProductRoute kind="asset-detail" detail={decodeURIComponent(assetId)} />;
}
