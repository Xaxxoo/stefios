import type { Metadata } from 'next';
import { CrossChainPage } from '../../../features/cross-chain/cross-chain-page';
export const metadata: Metadata = {
  title: 'Cross-chain',
  description: 'Cross-chain transfer monitoring.',
};
export default function CrossChainRoute() {
  return <CrossChainPage />;
}
