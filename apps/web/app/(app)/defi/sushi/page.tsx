import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Sushi',
  description: 'Sushi liquidity position context.',
};
export default function SushiPage() {
  return <ProductRoute kind="sushi" />;
}
