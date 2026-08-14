import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'RWA product',
  description: 'Source-aware tokenized product information.',
};
export default async function RwaDetailPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <ProductRoute kind="rwa-detail" detail={decodeURIComponent(assetId)} />;
}
