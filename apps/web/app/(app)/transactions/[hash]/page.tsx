import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Transaction',
  description: 'Stellar transaction details.',
};
export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <ProductRoute kind="transaction" detail={decodeURIComponent(hash)} />;
}
