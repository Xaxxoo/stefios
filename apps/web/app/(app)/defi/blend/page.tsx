import type { Metadata } from 'next';
import { BlendPage as BlendScreen } from '../../../../features/blend/blend-page';
export const metadata: Metadata = {
  title: 'Blend',
  description: 'Blend lending positions and health context.',
};
export default function BlendPage() {
  return <BlendScreen />;
}
