import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CrossChainTransfer } from '../../database/entities';
import { AuthModule } from '../auth/auth.module';
import { CrossChainController } from './cross-chain.controller';
import { CrossChainProviderRegistry, UnavailableCrossChainProvider } from './cross-chain-provider';
import { CrossChainService } from './cross-chain.service';

@Module({
  imports: [AuthModule, TypeOrmModule.forFeature([CrossChainTransfer])],
  controllers: [CrossChainController],
  providers: [
    CrossChainService,
    {
      provide: 'CROSS_CHAIN_PROVIDER_REGISTRY',
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        // Provider packages are intentionally opt-in. Unknown provider URLs or
        // contract addresses are never treated as a valid settlement source.
        const configured = config.get<string>('app.crossChainProvider');
        return new CrossChainProviderRegistry(
          configured ? [] : [new UnavailableCrossChainProvider()],
        );
      },
    },
  ],
  exports: [CrossChainService],
})
export class CrossChainModule {}
