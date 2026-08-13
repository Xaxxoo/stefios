import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AccountBalance,
  Asset,
  Operation,
  Payment,
  StellarAccount,
  SyncCursor,
  Transaction,
} from '../../database/entities';
import { RedisLockService } from './redis-lock';
import { WalletSyncProcessor } from './wallet-sync.processor';
import { WalletsController } from './wallets.controller';
import { WalletSyncService } from './wallet-sync.service';
import { SYNC_QUEUE } from './sync.types';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AccountBalance,
      Asset,
      Operation,
      Payment,
      StellarAccount,
      SyncCursor,
      Transaction,
    ]),
    BullModule.registerQueue({ name: SYNC_QUEUE }),
  ],
  controllers: [WalletsController],
  providers: [RedisLockService, WalletSyncService, WalletSyncProcessor],
})
export class WalletsModule {}
