import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Swap',
  description: 'Wallet-signed Stellar swap preparation.',
};
export default function SwapPage() {
  return <ProductRoute kind="swap" />;
}
