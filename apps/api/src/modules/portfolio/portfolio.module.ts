import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AccountBalance,
  BorrowPosition,
  LendingPosition,
  LiquidityPosition,
  PortfolioPosition,
  PortfolioSnapshot,
  ProtocolPosition,
  RewardPosition,
  StellarAccount,
} from '../../database/entities';
import { PricesModule } from '../prices/prices.module';
import { PortfolioController } from './portfolio.controller';
import { PortfolioService } from './portfolio.service';

@Module({
  imports: [
    PricesModule,
    TypeOrmModule.forFeature([
      AccountBalance,
      BorrowPosition,
      LendingPosition,
      LiquidityPosition,
      PortfolioPosition,
      PortfolioSnapshot,
      ProtocolPosition,
      RewardPosition,
      StellarAccount,
    ]),
  ],
  controllers: [PortfolioController],
  providers: [PortfolioService],
})
export class PortfolioModule {}
