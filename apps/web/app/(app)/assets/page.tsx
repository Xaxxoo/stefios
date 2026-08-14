import type { Metadata } from 'next';
import { AssetsPage } from '../../../features/assets/assets-pages';
export const metadata: Metadata = {
  title: 'Assets',
  description: 'Stellar asset discovery and metadata.',
};
export default function AssetsRoute() {
  return <AssetsPage />;
}
