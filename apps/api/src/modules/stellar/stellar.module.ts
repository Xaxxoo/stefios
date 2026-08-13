import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { StellarRpcClient } from '@sfo/stellar';

export const STELLAR_RPC_PROVIDER = Symbol('STELLAR_RPC_PROVIDER');

@Global()
@Module({
  providers: [
    {
      provide: STELLAR_RPC_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new StellarRpcClient({
          network: config.get<'testnet' | 'mainnet'>('app.stellarNetwork', 'testnet'),
          rpcUrl: config.getOrThrow<string>('app.stellarRpcUrl'),
        }),
    },
  ],
  exports: [STELLAR_RPC_PROVIDER],
})
export class StellarModule {}
