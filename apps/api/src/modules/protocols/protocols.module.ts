import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AquariusHttpProvider,
  AquariusSdkAdapter,
  BlendSdkAdapter,
  ProtocolRegistry,
  SushiSdkAdapter,
  UnavailableSushiProvider,
  TemplarSdkAdapter,
  UnavailableTemplarProvider,
} from '@sfo/protocol-adapters';
import type { AquariusConfig } from '@sfo/protocol-adapters';
import type { BlendConfig, BlendSimulationResult } from '@sfo/protocol-adapters';
import type { Network } from '@sfo/shared';
import { STELLAR_RPC_PROVIDER } from '../stellar/stellar.module';
import type { StellarAccountProvider, StellarRpcProvider } from '@sfo/stellar';
import { ProtocolsController } from './protocols.controller';
import { ProtocolsService } from './protocols.service';
import { PROTOCOL_REGISTRY } from './protocols.tokens';

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
        const aquariusConfig: AquariusConfig = {
          mainnet:
            config.get<string>('app.aquariusMainnetApi') &&
            config.get<string>('app.aquariusMainnetRpc') &&
            config.get<string>('app.aquariusMainnetPassphrase') &&
            config.get<string>('app.aquariusMainnetRouter')
              ? {
                  apiUrl: config.getOrThrow<string>('app.aquariusMainnetApi'),
                  rpc: config.getOrThrow<string>('app.aquariusMainnetRpc'),
                  passphrase: config.getOrThrow<string>('app.aquariusMainnetPassphrase'),
                  routerContractId: config.getOrThrow<string>('app.aquariusMainnetRouter'),
                }
              : undefined,
          testnet:
            config.get<string>('app.aquariusTestnetApi') &&
            config.get<string>('app.aquariusTestnetRpc') &&
            config.get<string>('app.aquariusTestnetPassphrase') &&
            config.get<string>('app.aquariusTestnetRouter')
              ? {
                  apiUrl: config.getOrThrow<string>('app.aquariusTestnetApi'),
                  rpc: config.getOrThrow<string>('app.aquariusTestnetRpc'),
                  passphrase: config.getOrThrow<string>('app.aquariusTestnetPassphrase'),
                  routerContractId: config.getOrThrow<string>('app.aquariusTestnetRouter'),
                }
              : undefined,
        };
        const aquariusData = new AquariusHttpProvider(aquariusConfig);
        const aquarius = new AquariusSdkAdapter(aquariusConfig, aquariusData, {
          getAccountSequence: async (account: string, _network: Network) =>
            (await stellar.getAccount(account)).sequence,
          simulate: async (transactionXdr: string, _network: Network) => {
            const result = await stellar.simulateTransaction(transactionXdr);
            const failed = 'error' in result && Boolean(result.error);
            return {
              status: failed ? ('failed' as const) : ('success' as const),
              error: failed ? String(result.error) : undefined,
            };
          },
        });
        return new ProtocolRegistry([
          adapter,
          aquarius,
          new SushiSdkAdapter(new UnavailableSushiProvider()),
          new TemplarSdkAdapter(new UnavailableTemplarProvider()),
        ]);
      },
    },
    ProtocolsService,
  ],
  exports: [ProtocolsService, PROTOCOL_REGISTRY],
})
export class ProtocolsModule {}
