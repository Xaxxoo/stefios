import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Your monitored Stellar assets and products.',
};
export default function WatchlistPage() {
  return <ProductRoute kind="watchlist" />;
}
