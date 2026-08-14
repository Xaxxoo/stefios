import type { Metadata } from 'next';
import { Suspense } from 'react';
import { RampsPage as RampsExperience } from '../../../features/ramps/ramps-page';
export const metadata: Metadata = {
  title: 'Anchors and ramps',
  description: 'Stellar anchor transaction monitoring.',
};
export default function RampsRoute() {
  return (
    <Suspense fallback={null}>
      <RampsExperience />
    </Suspense>
  );
}
