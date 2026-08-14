import type { Metadata } from 'next';
import { TransactionPage as TransactionScreen } from '../../../../features/activity/transaction-page';
export const metadata: Metadata = {
  title: 'Transaction',
  description: 'Stellar transaction details.',
};
export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  return <TransactionScreen hash={decodeURIComponent(hash)} />;
}
