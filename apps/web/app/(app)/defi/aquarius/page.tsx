import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Aquarius',
  description: 'Aquarius liquidity and swap exposure.',
};
export default function AquariusPage() {
  return <ProductRoute kind="aquarius" />;
}
