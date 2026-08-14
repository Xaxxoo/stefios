import type { Metadata } from 'next';
import { DefiPage as DefiScreen } from '../../../features/defi/defi-page';
export const metadata: Metadata = {
  title: 'DeFi',
  description: 'Stellar DeFi positions and protocol exposure.',
};
export default function DefiPage() {
  return <DefiScreen />;
}
