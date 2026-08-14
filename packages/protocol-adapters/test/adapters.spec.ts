import assert from 'node:assert/strict';
import test from 'node:test';
import {
  AquariusAdapter,
  BlendAdapter,
  ProtocolDataUnavailableError,
  ProtocolRegistry,
  SushiAdapter,
  TemplarAdapter,
  UnsupportedProtocolOperationError,
} from '../src';

const request = {
  account: 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
  network: 'testnet' as const,
  marketId: 'market-1',
  amount: '12.5',
};

test('declares explicit capabilities for each protocol', () => {
  const blend = new BlendAdapter();
  const aquarius = new AquariusAdapter();
  const sushi = new SushiAdapter();
  const templar = new TemplarAdapter();
  assert.equal(blend.capabilities.supply, true);
  assert.equal(blend.capabilities.swap, false);
  assert.equal(aquarius.capabilities.depositLiquidity, true);
  assert.equal(aquarius.capabilities.borrow, false);
  assert.equal(sushi.capabilities.swap, true);
  assert.equal(templar.capabilities.borrow, true);
  assert.equal(templar.capabilities.depositLiquidity, false);
});

test('rejects unsupported transaction operations before building anything', async () => {
  await assert.rejects(
    () => new BlendAdapter().buildSwapTransaction(request),
    (error: unknown) =>
      error instanceof UnsupportedProtocolOperationError &&
      error.protocol === 'blend' &&
      error.operation === 'swap',
  );
});

test('builds a normalized unsigned intent with the wallet as the only signer', async () => {
  const transaction = await new BlendAdapter().buildSupplyTransaction(request);
  assert.deepEqual(transaction, {
    protocol: 'blend',
    operation: 'supply',
    network: 'testnet',
    sourceAccount: request.account,
    marketId: 'market-1',
    asset: null,
    amount: '12.5',
    quoteAsset: null,
    minReceived: null,
    slippageBps: null,
    destination: null,
    positionId: null,
    requiredSigners: [request.account],
    status: 'unsigned',
  });
});

test('normalizes provider data without exposing provider-specific fields', async () => {
  const adapter = new AquariusAdapter({
    discoverMarkets: async () => [
      {
        id: 'pool-1',
        protocol: 'aquarius',
        network: 'testnet',
        name: 'XLM / USDC',
        assets: [],
        category: 'liquidity',
        enabled: true,
        source: 'mock',
        asOf: new Date('2026-01-01'),
      },
    ],
  });
  const markets = await adapter.discoverMarkets('testnet');
  assert.equal(markets[0]?.id, 'pool-1');
  assert.equal(Object.prototype.hasOwnProperty.call(markets[0] ?? {}, 'raw'), false);
});

test('reports missing data providers explicitly', async () => {
  await assert.rejects(
    () => new TemplarAdapter().getYieldMetrics('testnet'),
    (error: unknown) =>
      error instanceof ProtocolDataUnavailableError && error.capability === 'getYieldMetrics',
  );
});

test('registry prevents duplicate IDs and resolves registered adapters', () => {
  const registry = new ProtocolRegistry([new BlendAdapter(), new AquariusAdapter()]);
  assert.equal(registry.get('blend').name, 'Blend');
  assert.deepEqual(
    registry.list().map((adapter) => adapter.id),
    ['blend', 'aquarius'],
  );
  assert.throws(() => registry.register(new BlendAdapter()), /already registered/);
  assert.equal(registry.has('sushi'), false);
});

test('transaction source can decorate only the normalized transaction intent', async () => {
  const adapter = new SushiAdapter({
    buildTransaction: async (transaction) => ({
      ...transaction,
      requiredSigners: [
        ...transaction.requiredSigners,
        'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF',
      ],
    }),
  });
  const transaction = await adapter.buildSwapTransaction(request);
  assert.equal(transaction.status, 'unsigned');
  assert.equal(transaction.protocol, 'sushi');
  assert.equal(transaction.requiredSigners.length, 2);
});
