import type { Metadata } from 'next';
import { RiskPage as RiskScreen } from '../../../features/risk/risk-page';
export const metadata: Metadata = {
  title: 'Risk',
  description: 'Portfolio risk and exposure intelligence.',
};
export default function RiskPage() {
  return <RiskScreen />;
}
