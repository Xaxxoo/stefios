import type { Metadata } from 'next';
import { RwaDirectoryPage } from '../../../features/rwa/rwa-pages';
export const metadata: Metadata = {
  title: 'RWAs',
  description: 'Tokenized real-world asset intelligence on Stellar.',
};
export default function RwaPage() {
  return <RwaDirectoryPage />;
}
