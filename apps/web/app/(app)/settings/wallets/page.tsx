import type { Metadata } from 'next';
import { ProductRoute } from '../../../../features/product-routes/product-route';
export const metadata: Metadata = {
  title: 'Wallet settings',
  description: 'Connected wallet identities and networks.',
};
export default function WalletSettingsPage() {
  return <ProductRoute kind="wallets" />;
}
