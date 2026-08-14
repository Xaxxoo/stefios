import { registerAs } from '@nestjs/config';

export const configuration = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  stellarNetwork: process.env.STELLAR_NETWORK ?? 'testnet',
  stellarRpcUrl: process.env.STELLAR_RPC_URL,
  stablecoinPricesJson: process.env.STABLECOIN_PRICES_JSON,
  blendMainnetRpc: process.env.BLEND_MAINNET_RPC,
  blendMainnetPassphrase: process.env.BLEND_MAINNET_PASSPHRASE,
  blendMainnetPoolIdsJson: process.env.BLEND_MAINNET_POOL_IDS_JSON,
  blendTestnetRpc: process.env.BLEND_TESTNET_RPC,
  blendTestnetPassphrase: process.env.BLEND_TESTNET_PASSPHRASE,
  blendTestnetPoolIdsJson: process.env.BLEND_TESTNET_POOL_IDS_JSON,
  authChallengeTtlSeconds: Number(process.env.AUTH_CHALLENGE_TTL_SECONDS ?? 300),
  authSessionTtlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 86400),
}));
