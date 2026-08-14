import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { TransactionsService } from './transactions.service';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const asset = {
  network: 'testnet' as const,
  type: 'contract' as const,
  contractAddress: 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
};

function service() {
  const adapter = {
    name: 'Mock Protocol',
    capabilities: {
      supply: true,
      withdraw: false,
      borrow: false,
      repay: false,
      depositLiquidity: false,
      withdrawLiquidity: false,
      claim: false,
      swap: false,
      payment: false,
    },
    buildSupplyTransaction: async () => ({
      protocol: 'blend',
      operation: 'supply',
      network: 'testnet',
      sourceAccount: account,
      marketId: 'market',
      asset,
      amount: '1.25',
      quoteAsset: null,
      minReceived: null,
      slippageBps: null,
      destination: null,
      positionId: null,
      decimals: 7,
      reserveTokenIds: [],
      requiredSigners: [account],
      status: 'simulated' as const,
      transactionXdr: 'unsigned-xdr',
      preview: {
        title: 'Supply',
        summary: 'Supply collateral',
        warnings: [],
        simulation: { status: 'success' },
      },
    }),
    buildWithdrawTransaction: async () => {
      throw new Error('unsupported');
    },
    buildBorrowTransaction: async () => {
      throw new Error('unsupported');
    },
    buildRepayTransaction: async () => {
      throw new Error('unsupported');
    },
    buildDepositLiquidityTransaction: async () => {
      throw new Error('unsupported');
    },
    buildWithdrawLiquidityTransaction: async () => {
      throw new Error('unsupported');
    },
    buildClaimTransaction: async () => {
      throw new Error('unsupported');
    },
    buildSwapTransaction: async () => {
      throw new Error('unsupported');
    },
  };
  const registry = { get: () => adapter };
  const stellar = {
    getAccount: async () => ({ address: account, sequence: '1', balances: [], raw: {} }),
    simulate: async () => ({ status: 'success' }),
    submitAlreadySignedTransaction: async () => ({ status: 'PENDING', hash: 'hash-1' }),
    getTransaction: async (hash: string) => ({ status: 'SUCCESS', hash }),
  };
  const config = { get: () => 'testnet' };
  return new TransactionsService(registry as never, stellar as never, config as never);
}

describe('TransactionsService', () => {
  it('composes a simulated intent with warnings and readable decoding without signing', async () => {
    const result = await service().compose({
      protocol: 'blend',
      action: 'supply',
      account,
      network: 'testnet',
      asset,
      amount: '1.25',
    });
    assert.equal(result.lifecycle, 'previewed');
    assert.equal(result.intent.inputAssets[0]?.amount, '1.25');
    assert.equal(result.preview.decoded.sourceAccount, account);
  });

  it('submits only already-signed XDR and monitors the returned hash', async () => {
    const composer = service();
    await assert.rejects(composer.submit('mainnet', 'signed-xdr'));
    const submitted = await composer.submit('testnet', 'signed-xdr');
    assert.equal(submitted.hash, 'hash-1');
    assert.deepEqual(await composer.monitor('hash-1'), { status: 'SUCCESS', hash: 'hash-1' });
  });

  it('builds and simulates a native payment without signing it', async () => {
    const result = await service().compose({
      protocol: 'stellar',
      action: 'payment',
      account,
      network: 'testnet',
      asset: { network: 'testnet', type: 'native' },
      amount: '1.25',
      destination: account,
      memo: 'invoice-1',
    });
    assert.equal(result.intent.action, 'payment');
    assert.equal(result.lifecycle, 'previewed');
    assert.ok(result.transactionXdr.length > 0);
    assert.equal(result.intent.outputAssets[0]?.amount, '1.25');
  });
});
