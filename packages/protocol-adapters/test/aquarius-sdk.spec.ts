import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StrKey, xdr } from '@stellar/stellar-sdk';
import { AquariusSdkAdapter } from '../src/aquarius-sdk';
import type { ProtocolQuote } from '../src/types';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const contract = StrKey.encodeContract(Buffer.alloc(32, 9));
const poolIndex = 'a'.repeat(64);
const config = {
  testnet: {
    apiUrl: 'https://example.invalid/api/external/v1',
    rpc: 'https://example.invalid/rpc',
    passphrase: 'Test SDF Network ; September 2015',
    routerContractId: contract,
  },
} as const;
const token = { network: 'testnet' as const, type: 'contract' as const, contractAddress: contract };
const quote: ProtocolQuote = {
  protocol: 'aquarius',
  network: 'testnet',
  tokenIn: token,
  tokenOut: token,
  amountIn: '1',
  amountOut: '0.9',
  route: [contract],
  routeXdr: xdr.ScVal.scvVec([]).toXDR('base64'),
  priceImpact: null,
  slippageBps: '50',
  source: 'test',
  quotedAt: new Date(),
  stale: false,
};

function adapter() {
  return new AquariusSdkAdapter(
    config,
    {
      listPools: async () => [
        {
          address: contract,
          index: poolIndex,
          tokens_addresses: [contract],
          tokens_str: ['TEST'],
          pool_type: 'constant_product',
          fee: '0.0010',
        },
      ],
      quote: async () => quote,
    },
    { getAccountSequence: async () => '1', simulate: async () => ({ status: 'success' }) },
  );
}

test('normalizes current Aquarius pool metadata', async () => {
  const markets = await adapter().discoverMarkets('testnet');
  assert.equal(markets[0]?.protocol, 'aquarius');
  assert.equal(markets[0]?.fee, '0.0010');
  assert.equal(markets[0]?.poolType, 'constant_product');
});

test('builds and simulates liquidity deposit with wallet signer only', async () => {
  const prepared = await adapter().buildDepositLiquidityTransaction({
    account,
    network: 'testnet',
    marketId: contract,
    poolIndex,
    tokenAssets: [token],
    amounts: ['1'],
    minShares: '0.9',
    decimals: 7,
  });
  assert.equal(prepared.status, 'simulated');
  assert.deepEqual(prepared.requiredSigners, [account]);
});

test('fetches a fresh route while preparing a swap', async () => {
  let quoteCalls = 0;
  const instance = new AquariusSdkAdapter(
    config,
    {
      listPools: async () => [],
      quote: async () => {
        quoteCalls += 1;
        return quote;
      },
    },
    { getAccountSequence: async () => '1', simulate: async () => ({ status: 'success' }) },
  );
  const prepared = await instance.buildSwapTransaction({
    account,
    network: 'testnet',
    asset: token,
    quoteAsset: token,
    amount: '1',
    slippageBps: '50',
    decimals: 7,
  });
  assert.equal(quoteCalls, 1);
  assert.equal(prepared.status, 'simulated');
});

test('rejects stale routes before building a swap transaction', async () => {
  const stale = { ...quote, stale: true };
  const instance = new AquariusSdkAdapter(
    config,
    { listPools: async () => [], quote: async () => stale },
    { getAccountSequence: async () => '1', simulate: async () => ({ status: 'success' }) },
  );
  await assert.rejects(
    () =>
      instance.buildSwapTransaction({
        account,
        network: 'testnet',
        asset: token,
        quoteAsset: token,
        amount: '1',
        slippageBps: '50',
        decimals: 7,
      }),
    /quote became stale/,
  );
});
