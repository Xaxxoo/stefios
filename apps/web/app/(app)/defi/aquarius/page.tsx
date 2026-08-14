import type { Metadata } from 'next';
import { AquariusPage as AquariusScreen } from '../../../../features/aquarius/aquarius-page';
export const metadata: Metadata = {
  title: 'Aquarius',
  description: 'Aquarius liquidity and swap exposure.',
};
export default function AquariusPage() {
  return <AquariusScreen />;
}
