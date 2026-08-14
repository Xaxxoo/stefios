import type { Metadata } from 'next';
import { PaymentsPage as PaymentsScreen } from '../../../features/payments/payments-page';
export const metadata: Metadata = {
  title: 'Payments',
  description: 'Stellar payment activity and preparation.',
};
export default function PaymentsPage() {
  return <PaymentsScreen />;
}
