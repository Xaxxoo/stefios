import type { Metadata } from 'next';
import { SendPaymentPage } from '../../../../features/payments/send-page';
export const metadata: Metadata = {
  title: 'Send payment',
  description: 'Prepare a wallet-signed Stellar payment.',
};
export default function SendPage() {
  return <SendPaymentPage />;
}
