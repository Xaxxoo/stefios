import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BlendSdkAdapter, ProtocolRegistry } from '@sfo/protocol-adapters';
import type { BlendConfig, BlendSimulationResult } from '@sfo/protocol-adapters';
import type { Network } from '@sfo/shared';
import { STELLAR_RPC_PROVIDER } from '../stellar/stellar.module';
import type { StellarAccountProvider, StellarRpcProvider } from '@sfo/stellar';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsService } from './protocols.service';

export const PROTOCOL_REGISTRY = Symbol('PROTOCOL_REGISTRY');

function poolIds(value: string | undefined): readonly string[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string')
      : [];
  } catch {
    return [];
  }
}

@Module({
  controllers: [ProtocolsController],
  providers: [
    {
      provide: PROTOCOL_REGISTRY,
      inject: [ConfigService, STELLAR_RPC_PROVIDER],
      useFactory: (config: ConfigService, stellar: StellarRpcProvider & StellarAccountProvider) => {
        const blendConfig: BlendConfig = {
          mainnet:
            config.get<string>('app.blendMainnetRpc') &&
            config.get<string>('app.blendMainnetPassphrase')
              ? {
                  rpc: config.getOrThrow<string>('app.blendMainnetRpc'),
                  passphrase: config.getOrThrow<string>('app.blendMainnetPassphrase'),
                  poolIds: poolIds(config.get<string>('app.blendMainnetPoolIdsJson')),
                }
              : undefined,
          testnet:
            config.get<string>('app.blendTestnetRpc') &&
            config.get<string>('app.blendTestnetPassphrase')
              ? {
                  rpc: config.getOrThrow<string>('app.blendTestnetRpc'),
                  passphrase: config.getOrThrow<string>('app.blendTestnetPassphrase'),
                  poolIds: poolIds(config.get<string>('app.blendTestnetPoolIdsJson')),
                }
              : undefined,
        };
        const adapter = new BlendSdkAdapter(blendConfig, {
          getAccountSequence: async (account: string, _network: Network) =>
            (await stellar.getAccount(account)).sequence,
          simulate: async (
            transactionXdr: string,
            _network: Network,
          ): Promise<BlendSimulationResult> => {
            const result = await stellar.simulateTransaction(transactionXdr);
            const failed = 'error' in result && Boolean(result.error);
            return {
              status: failed ? 'failed' : 'success',
              error: failed ? String(result.error) : undefined,
            };
          },
        });
        return new ProtocolRegistry([adapter]);
      },
    },
    ProtocolsService,
  ],
  exports: [ProtocolsService],
})
export class ProtocolsModule {}
