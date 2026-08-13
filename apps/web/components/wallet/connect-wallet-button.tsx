'use client';

import { useState } from 'react';
import { Button } from '../ui/design-system';
import { ConnectWalletModal } from './connect-wallet-modal';

export function ConnectWalletButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button size={compact ? 'sm' : 'md'} variant="primary" onClick={() => setOpen(true)}>
        Connect wallet
      </Button>
      <ConnectWalletModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
