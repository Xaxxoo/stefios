import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Yield',
  description: 'Source-aware yield intelligence.',
};
export default function YieldPage() {
  return <ProductRoute kind="yield" />;
}
