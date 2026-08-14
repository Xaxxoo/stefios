import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RwaMetadata } from '../../database/entities';
import { PortfolioModule } from '../portfolio/portfolio.module';
import { ProtocolsModule } from '../protocols/protocols.module';
import { RiskController } from './risk.controller';
import { RiskService } from './risk.service';

@Module({
  imports: [PortfolioModule, ProtocolsModule, TypeOrmModule.forFeature([RwaMetadata])],
  controllers: [RiskController],
  providers: [RiskService],
})
export class RiskModule {}
