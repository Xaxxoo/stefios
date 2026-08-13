import { z } from 'zod';

const clientEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  NEXT_PUBLIC_ENABLE_DEV_FIXTURES: z.enum(['true', 'false']).optional(),
  NEXT_PUBLIC_STELLAR_NETWORK: z.enum(['testnet', 'mainnet']).default('testnet'),
});
export const clientEnv = clientEnvSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1',
  NEXT_PUBLIC_ENABLE_DEV_FIXTURES: process.env.NEXT_PUBLIC_ENABLE_DEV_FIXTURES,
  NEXT_PUBLIC_STELLAR_NETWORK: process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'testnet',
});
