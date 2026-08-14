import type { Metadata } from 'next';
import { WalletsSettingsPage } from '../../../../features/settings/wallets-page';
export const metadata: Metadata = {
  title: 'Wallet settings',
  description: 'Connected wallet identities and networks.',
};
export default function WalletsRoute() {
  return <WalletsSettingsPage />;
}
