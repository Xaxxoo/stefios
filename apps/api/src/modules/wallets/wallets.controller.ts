import { Controller, Get, Param, Post, Query } from '@nestjs/common';
import type { WalletSyncService } from './wallet-sync.service';

@Controller({ path: 'wallets', version: '1' })
export class WalletsController {
  constructor(private readonly sync: WalletSyncService) {}

  @Get()
  list(@Query('network') network?: 'testnet' | 'mainnet', @Query('address') address?: string) {
    return this.sync.listWallets(network, address);
  }

  @Post(':address/sync')
  syncWallet(@Param('address') address: string, @Query('network') network?: 'testnet' | 'mainnet') {
    return this.sync.enqueue({ network: network ?? 'testnet', address });
  }

  @Get(':address/sync-status')
  status(@Param('address') address: string, @Query('network') network?: 'testnet' | 'mainnet') {
    return this.sync.status(address, network ?? 'testnet');
  }
}
