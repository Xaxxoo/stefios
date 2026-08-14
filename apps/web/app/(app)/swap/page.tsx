import type { Metadata } from 'next';
import { SwapPage as SwapScreen } from '../../../features/swap/swap-page';
export const metadata: Metadata = {
  title: 'Swap',
  description: 'Wallet-signed Stellar swap preparation.',
};
export default function SwapPage() {
  return <SwapScreen />;
}
