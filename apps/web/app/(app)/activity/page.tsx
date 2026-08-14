import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Activity',
  description: 'Normalized account activity.',
};
export default function ActivityPage() {
  return <ProductRoute kind="activity" />;
}
