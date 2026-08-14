import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Receive payment',
  description: 'Receive Stellar payments with your connected wallet.',
};
export default function ReceivePage() {
  return <ProductRoute kind="receive" />;
}
