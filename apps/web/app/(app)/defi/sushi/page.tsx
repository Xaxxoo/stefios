import type { Metadata } from 'next';
import { SushiPage as SushiScreen } from '../../../../features/sushi/sushi-page';
export const metadata: Metadata = {
  title: 'Sushi',
  description: 'Sushi liquidity position context.',
};
export default function SushiPage() {
  return <SushiScreen />;
}
