import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Anchors and ramps',
  description: 'Stellar anchor transaction monitoring.',
};
export default function RampsPage() {
  return <ProductRoute kind="ramps" />;
}
