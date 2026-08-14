import type { Metadata } from 'next';
import { ReceivePaymentPage } from '../../../../features/payments/receive-page';
export const metadata: Metadata = {
  title: 'Receive payment',
  description: 'Receive Stellar payments with your connected wallet.',
};
export default function ReceivePage() {
  return <ReceivePaymentPage />;
}
