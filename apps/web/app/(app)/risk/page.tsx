import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Risk',
  description: 'Portfolio risk and exposure intelligence.',
};
export default function RiskPage() {
  return <ProductRoute kind="risk" />;
}
