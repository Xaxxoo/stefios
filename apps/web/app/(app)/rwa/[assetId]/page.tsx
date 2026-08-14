import type { Metadata } from 'next';
import { RwaDetailPage } from '../../../../features/rwa/rwa-pages';
export const metadata: Metadata = {
  title: 'RWA product',
  description: 'Source-aware tokenized product information.',
};
export default async function RwaDetailRoute({ params }: { params: Promise<{ assetId: string }> }) {
  const { assetId } = await params;
  return <RwaDetailPage assetId={decodeURIComponent(assetId)} />;
}
