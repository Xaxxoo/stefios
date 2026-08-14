import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Portfolio and account alert rules.',
};
export default function AlertsPage() {
  return <ProductRoute kind="alerts" />;
}
