import { describe, it } from 'node:test';
import * as assert from 'node:assert/strict';
import { StellarProviderError } from '../src/types';
import { StellarRpcClient } from '../src/rpc-provider';

const account = { sequenceNumber: () => '42' };

describe('StellarRpcClient', () => {
  it('normalizes account and ledger reads through RPC', async () => {
    const server = {
      getAccount: async () => account,
      getLatestLedger: async () => ({ id: 'ledger-id', sequence: 99, protocolVersion: '22' }),
      getHealth: async () => ({ status: 'healthy' }),
    };
    const client = new StellarRpcClient({
      network: 'testnet',
      rpcUrl: 'https://rpc.invalid',
      server: server as never,
    });
    assert.deepEqual(await client.getAccount('GACCOUNT'), {
      address: 'GACCOUNT',
      sequence: '42',
      balances: [],
      raw: account,
    });
    assert.deepEqual(await client.getLatestLedger(), {
      sequence: 99,
      hash: 'ledger-id',
      closeTime: '',
      raw: await server.getLatestLedger(),
    });
    assert.equal((await client.getHealth()).status, 'up');
  });

  it('retries transient failures with backoff and eventually succeeds', async () => {
    let attempts = 0;
    const server = {
      getLatestLedger: async () => {
        attempts += 1;
        if (attempts < 3) throw Object.assign(new Error('rate limit'), { status: 429 });
        return { id: 'ok', sequence: 1, protocolVersion: '22' };
      },
    };
    const client = new StellarRpcClient({
      network: 'mainnet',
      rpcUrl: 'https://rpc.invalid',
      server: server as never,
      backoffMs: 1,
      maxRetries: 2,
    });
    assert.equal((await client.getLatestLedger()).sequence, 1);
    assert.equal(attempts, 3);
  });

  it('normalizes exhausted provider errors', async () => {
    const server = {
      getLatestLedger: async () => {
        throw Object.assign(new Error('service unavailable'), { status: 503 });
      },
    };
    const client = new StellarRpcClient({
      network: 'testnet',
      rpcUrl: 'https://rpc.invalid',
      server: server as never,
      backoffMs: 1,
      maxRetries: 1,
    });
    await assert.rejects(
      client.getLatestLedger(),
      (error: unknown) =>
        error instanceof StellarProviderError && error.retryable && error.statusCode === 503,
    );
  });

  it('submits only an XDR string through the SDK server', async () => {
    let submitted = false;
    const server = {
      sendTransaction: async (transaction: unknown) => {
        submitted = typeof transaction === 'object';
        return { status: 'PENDING', hash: 'hash' };
      },
    };
    const client = new StellarRpcClient({
      network: 'testnet',
      rpcUrl: 'https://rpc.invalid',
      server: server as never,
    });
    await assert.rejects(client.submitAlreadySignedTransaction('not-valid-xdr'));
    assert.equal(submitted, false);
  });
});
