import type { Metadata } from 'next';
import { YieldPage as YieldScreen } from '../../../features/yield/yield-page';
export const metadata: Metadata = {
  title: 'Yield',
  description: 'Source-aware yield intelligence.',
};
export default function YieldPage() {
  return <YieldScreen />;
}
