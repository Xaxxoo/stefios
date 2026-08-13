import { registerAs } from '@nestjs/config';

export const configuration = registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.API_PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
  databaseUrl: process.env.DATABASE_URL,
  redisUrl: process.env.REDIS_URL,
  stellarNetwork: process.env.STELLAR_NETWORK ?? 'testnet',
  stellarRpcUrl: process.env.STELLAR_RPC_URL,
  authChallengeTtlSeconds: Number(process.env.AUTH_CHALLENGE_TTL_SECONDS ?? 300),
  authSessionTtlSeconds: Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 86400),
}));
