import type { Metadata } from 'next';
import { ProductRoute } from '../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'RWAs',
  description: 'Tokenized real-world asset intelligence on Stellar.',
};
export default function RwaPage() {
  return <ProductRoute kind="rwa" />;
}
