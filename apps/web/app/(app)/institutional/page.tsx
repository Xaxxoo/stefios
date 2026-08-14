import type { Metadata } from 'next';
import { InstitutionalPage } from '../../../features/institutional/institutional-page';
export const metadata: Metadata = {
  title: 'Institutional',
  description: 'Capital management and treasury workflows.',
};
export default function InstitutionalRoute() {
  return <InstitutionalPage />;
}
