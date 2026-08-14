import type { Metadata } from 'next';
import { WatchlistPage } from '../../../features/watchlist/watchlist-page';
export const metadata: Metadata = {
  title: 'Watchlist',
  description: 'Your monitored Stellar assets and products.',
};
export default function WatchlistRoute() {
  return <WatchlistPage />;
}
