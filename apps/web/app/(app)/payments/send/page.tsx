import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Send payment',
  description: 'Prepare a wallet-signed Stellar payment.',
};
export default function SendPage() {
  return <ProductRoute kind="send" />;
}
