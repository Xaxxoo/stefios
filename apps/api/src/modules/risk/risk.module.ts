import { Module } from '@nestjs/common';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ProtocolsModule } from '../protocols/protocols.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [PortfolioModule, ProtocolsModule],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
