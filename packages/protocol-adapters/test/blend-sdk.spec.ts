import { test } from 'node:test';
import assert from 'node:assert/strict';
import { StrKey } from '@stellar/stellar-sdk';
import { BlendSdkAdapter } from '../src/blend-sdk';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const contract = StrKey.encodeContract(Buffer.alloc(32, 7));
const config = {
  testnet: {
    rpc: 'https://example.invalid/rpc',
    passphrase: 'Test SDF Network ; September 2015',
    poolIds: [contract],
  },
} as const;

test('requires explicit configured Blend pool IDs', async () => {
  const adapter = new BlendSdkAdapter(
    {},
    { getAccountSequence: async () => '1', simulate: async () => ({ status: 'success' }) },
  );
  await assert.rejects(
    () => adapter.discoverMarkets('testnet'),
    /No verified Blend pool IDs configured/,
  );
});

test('builds, simulates, and previews a supply transaction without signing it', async () => {
  let simulatedXdr = '';
  const adapter = new BlendSdkAdapter(config, {
    getAccountSequence: async () => '1',
    simulate: async (transactionXdr) => {
      simulatedXdr = transactionXdr;
      return { status: 'success', latestLedger: '100' };
    },
  });
  const prepared = await adapter.buildSupplyTransaction({
    account,
    network: 'testnet',
    marketId: contract,
    asset: { network: 'testnet', type: 'contract', contractAddress: contract },
    amount: '1.25',
    decimals: 7,
  });
  assert.equal(prepared.status, 'simulated');
  assert.equal(prepared.requiredSigners[0], account);
  assert.equal(prepared.preview.simulation.latestLedger, '100');
  assert.equal(simulatedXdr, prepared.transactionXdr);
  assert.ok(prepared.transactionXdr.length > 0);
});

test('does not return a transaction when simulation fails', async () => {
  const adapter = new BlendSdkAdapter(config, {
    getAccountSequence: async () => '1',
    simulate: async () => ({ status: 'failed', error: 'insufficient collateral' }),
  });
  await assert.rejects(
    () =>
      adapter.buildBorrowTransaction({
        account,
        network: 'testnet',
        marketId: contract,
        asset: { network: 'testnet', type: 'contract', contractAddress: contract },
        amount: '1',
        decimals: 7,
      }),
    /simulation failed: insufficient collateral/,
  );
});

test('claim uses explicit reserve token IDs', async () => {
  const adapter = new BlendSdkAdapter(config, {
    getAccountSequence: async () => '1',
    simulate: async () => ({ status: 'success' }),
  });
  const prepared = await adapter.buildClaimTransaction({
    account,
    network: 'testnet',
    marketId: contract,
    reserveTokenIds: [1, 2],
  });
  assert.deepEqual(prepared.reserveTokenIds, [1, 2]);
  assert.equal(prepared.operation, 'claim');
});
