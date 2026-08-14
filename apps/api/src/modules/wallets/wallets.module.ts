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
  WalletConnection,
} from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { RedisLockService } from './redis-lock';
import { WalletSyncProcessor } from './wallet-sync.processor';
import { WalletsController } from './wallets.controller';
import { WalletSyncService } from './wallet-sync.service';
import { SYNC_QUEUE } from './sync.types';

@Module({
  imports: [
    AuthModule,
    TypeOrmModule.forFeature([
      AccountBalance,
      Asset,
      Operation,
      Payment,
      StellarAccount,
      SyncCursor,
      Transaction,
      WalletConnection,
    ]),
    BullModule.registerQueue({ name: SYNC_QUEUE }),
  ],
  controllers: [WalletsController],
  providers: [RedisLockService, WalletSyncService, WalletSyncProcessor],
})
export class WalletsModule {}
