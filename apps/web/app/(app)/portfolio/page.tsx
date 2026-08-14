import type { Metadata } from 'next';
import { PortfolioPage } from '../../../features/portfolio/portfolio-page';
export const metadata: Metadata = {
  title: 'Portfolio',
  description: 'Normalized Stellar portfolio view.',
};
export default function PortfolioRoute() {
  return <PortfolioPage />;
}
