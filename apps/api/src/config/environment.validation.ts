export function validateEnvironment(values: Record<string, unknown>): Record<string, unknown> {
  if (values.NODE_ENV === 'test') return values;
  const required = [
    'DATABASE_URL',
    'REDIS_URL',
    'WEB_ORIGIN',
    'STELLAR_NETWORK',
    'STELLAR_RPC_URL',
  ];
  for (const key of required)
    if (!values[key]) throw new Error(`Missing required environment variable: ${key}`);
  if (!['development', 'production'].includes(String(values.NODE_ENV ?? 'development')))
    throw new Error('NODE_ENV must be development, production, or test');
  if (!['testnet', 'mainnet'].includes(String(values.STELLAR_NETWORK)))
    throw new Error('STELLAR_NETWORK must be testnet or mainnet');
  for (const key of ['DATABASE_URL', 'REDIS_URL', 'WEB_ORIGIN', 'STELLAR_RPC_URL']) {
    try {
      const url = new URL(String(values[key]));
      if (key === 'WEB_ORIGIN' && !['http:', 'https:'].includes(url.protocol))
        throw new Error('WEB_ORIGIN must use HTTP(S)');
      if (
        key !== 'WEB_ORIGIN' &&
        !['http:', 'https:', 'postgres:', 'postgresql:', 'redis:'].includes(url.protocol)
      )
        throw new Error(`${key} has an unsupported URL scheme`);
    } catch (error) {
      throw new Error(
        `${key} must be a valid URL: ${error instanceof Error ? error.message : 'invalid'}`,
      );
    }
  }
  return values;
}
