import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Cross-chain',
  description: 'Cross-chain transfer monitoring.',
};
export default function CrossChainPage() {
  return <ProductRoute kind="cross-chain" />;
}
