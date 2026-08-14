import type { Metadata } from 'next';
import { SecuritySettingsPage } from '../../../../features/settings/security-page';
export const metadata: Metadata = {
  title: 'Security settings',
  description: 'Sessions and wallet signing security.',
};
export default function SecurityRoute() {
  return <SecuritySettingsPage />;
}
