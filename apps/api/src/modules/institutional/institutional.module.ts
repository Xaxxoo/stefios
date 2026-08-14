import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { StellarAccount, Transaction, WalletConnection } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { RiskModule } from '../risk/risk.module';
import { InstitutionalController } from './institutional.controller';
import { InstitutionalService } from './institutional.service';

@Module({
  imports: [
    AuthModule,
    PortfolioModule,
    RiskModule,
    TypeOrmModule.forFeature([WalletConnection, StellarAccount, Transaction]),
  ],
  controllers: [InstitutionalController],
  providers: [InstitutionalService],
})
export class InstitutionalModule {}
