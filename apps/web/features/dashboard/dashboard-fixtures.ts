export const dashboardDevFixtures = {
  enabled:
    process.env.NODE_ENV === 'development' &&
    process.env.NEXT_PUBLIC_ENABLE_DEV_FIXTURES === 'true',
  allocation: [
    { label: 'XLM', value: 42 },
    { label: 'Stablecoins', value: 33 },
    { label: 'RWAs', value: 15 },
    { label: 'DeFi', value: 10 },
  ],
};
