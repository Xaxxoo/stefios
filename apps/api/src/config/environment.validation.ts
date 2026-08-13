export function validateEnvironment(values: Record<string, unknown>): Record<string, unknown> {
  const required = ['DATABASE_URL', 'REDIS_URL'];
  if (values.NODE_ENV === 'test') return values;
  for (const key of required) {
    if (!values[key]) throw new Error(`Missing required environment variable: ${key}`);
  }
  return values;
}
