import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Blend',
  description: 'Blend lending positions and health context.',
};
export default function BlendPage() {
  return <ProductRoute kind="blend" />;
}
