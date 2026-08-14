import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Payments',
  description: 'Stellar payment activity and preparation.',
};
export default function PaymentsPage() {
  return <ProductRoute kind="payments" />;
}
