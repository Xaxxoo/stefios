import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Assets',
  description: 'Stellar asset discovery and metadata.',
};
export default function AssetsPage() {
  return <ProductRoute kind="assets" />;
}
