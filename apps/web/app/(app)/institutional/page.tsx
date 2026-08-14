import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Institutional',
  description: 'Capital management and treasury workflows.',
};
export default function InstitutionalPage() {
  return <ProductRoute kind="institutional" />;
}
