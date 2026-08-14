import type { Metadata } from 'next';
import { AlertsPage } from '../../../features/alerts/alerts-page';
export const metadata: Metadata = {
  title: 'Alerts',
  description: 'Portfolio and account alert rules.',
};
export default function AlertsRoute() {
  return <AlertsPage />;
}
