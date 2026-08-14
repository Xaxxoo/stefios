import type { Metadata } from 'next';
import { AssetDetailPage } from '../../../../features/assets/assets-pages';
export const metadata: Metadata = {
  title: 'Asset detail',
  description: 'Canonical asset identity and source-aware metadata.',
};
export default async function AssetPage({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <AssetDetailPage assetId={decodeURIComponent(assetId)} />;
}
