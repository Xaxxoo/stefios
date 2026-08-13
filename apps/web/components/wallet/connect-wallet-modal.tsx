'use client';

import { useState } from 'react';
import { Modal, Button, StatusBadge } from '../ui/design-system';
import { clientEnv } from '../../lib/config/env';
import { useWallet } from '../../lib/wallet/context';

export function ConnectWalletModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { connect, connecting, error } = useWallet();
  const [attempted, setAttempted] = useState(false);
  async function handleConnect() {
    setAttempted(true);
    try {
      await connect();
      onClose();
    } catch {
      /* state is exposed by the wallet context */
    }
  }
  return (
    <Modal open={open} title="Connect a Stellar wallet" onClose={onClose}>
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--muted))]">
          <span className="h-1.5 w-1.5 rounded-full bg-[hsl(var(--positive))]" />
          Choose a supported wallet provider
        </div>
        <div className="rounded-lg border border-[hsl(var(--accent))]/20 bg-[hsl(var(--accent))]/[0.06] p-4">
          <div className="flex items-center justify-between">
            <span className="font-medium">Freighter</span>
            <StatusBadge tone="positive">Browser wallet</StatusBadge>
          </div>
          <p className="mt-2 text-sm leading-6 text-[hsl(var(--muted))]">
            Connect through the wallet extension. Financial OS never asks for a secret key or seed
            phrase.
          </p>
          <Button
            className="mt-4 w-full"
            variant="primary"
            onClick={() => void handleConnect()}
            disabled={connecting}
          >
            {connecting ? 'Connecting and authenticating…' : 'Connect Freighter'}
          </Button>
        </div>
        {attempted && !connecting && error ? (
          <div
            role="alert"
            className="rounded-lg border border-[hsl(var(--negative))]/25 bg-[hsl(var(--negative))]/[0.06] p-3 text-sm text-[hsl(var(--negative))]"
          >
            {error}
          </div>
        ) : null}
        <div className="rounded-lg border border-white/[0.08] p-4 opacity-70">
          <div className="flex items-center justify-between">
            <span className="font-medium">Other Stellar wallets</span>
            <StatusBadge>Not configured</StatusBadge>
          </div>
          <p className="mt-2 text-xs leading-5 text-[hsl(var(--muted))]">
            Additional providers will appear here after their maintained browser integrations are
            configured.
          </p>
        </div>
        <p className="text-xs leading-5 text-[hsl(var(--muted))]">
          Expected network:{' '}
          <span className="font-medium text-foreground">
            {clientEnv.NEXT_PUBLIC_STELLAR_NETWORK}
          </span>
          . You can switch accounts or networks in your wallet; the app will ask you to
          re-authenticate.
        </p>
      </div>
    </Modal>
  );
}
