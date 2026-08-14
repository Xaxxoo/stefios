import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Normalized Stellar portfolio view.',
};
export default function PortfolioPage() {
  return <ProductRoute kind="portfolio" />;
}
