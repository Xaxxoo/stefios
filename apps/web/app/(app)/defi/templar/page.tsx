import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Templar',
  description: 'Templar collateral and borrowing context.',
};
export default function TemplarPage() {
  return <ProductRoute kind="templar" />;
}
