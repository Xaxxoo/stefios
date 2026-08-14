import type { Metadata } from 'next';
import { TemplarPage as TemplarScreen } from '../../../../features/templar/templar-page';
export const metadata: Metadata = {
  title: 'Templar',
  description: 'Templar collateral and borrowing context.',
};
export default function TemplarPage() {
  return <TemplarScreen />;
}
