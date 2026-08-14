import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'DeFi',
  description: 'Stellar DeFi positions and protocol exposure.',
};
export default function DefiPage() {
  return <ProductRoute kind="defi" />;
}
