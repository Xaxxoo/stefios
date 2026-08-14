import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Security settings',
  description: 'Sessions and wallet signing security.',
};
export default function SecuritySettingsPage() {
  return <ProductRoute kind="security" />;
}
