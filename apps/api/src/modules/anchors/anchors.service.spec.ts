import 'reflect-metadata';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { HttpAnchorAdapter, type AnchorInfo } from './anchor-adapter';
import { AnchorsService } from './anchors.service';

const account = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const info: AnchorInfo = {
  slug: 'example-anchor',
  domain: 'anchor.example',
  network: 'testnet',
  name: 'Example Anchor',
  description: null,
  organizationUrl: null,
  stellarTomlUrl: 'https://anchor.example/.well-known/stellar.toml',
  protocols: ['sep24'],
  authenticationRequired: true,
  webAuthEndpoint: 'https://anchor.example/auth',
  kycServer: 'https://anchor.example/kyc',
  transferServer: null,
  hostedTransferServer: 'https://anchor.example/sep24',
  quoteServer: null,
  crossBorderServer: null,
  assets: [],
  source: 'sep-1',
  discoveredAt: new Date().toISOString(),
};

describe('AnchorsService', () => {
  it('persists interactive state and does not expose the anchor auth token', async () => {
    const anchor = {
      id: 'anchor-id',
      slug: info.slug,
      network: info.network,
      name: info.name,
      domain: info.domain,
      providerMetadata: { info },
    };
    const transactionStore: Record<string, unknown>[] = [];
    const anchors = {
      findOne: async () => anchor,
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => value,
      find: async () => [anchor],
    };
    const transactions = {
      create: (value: Record<string, unknown>) => value,
      save: async (value: Record<string, unknown>) => {
        const row = { id: 'local-id', createdAt: new Date(), updatedAt: new Date(), ...value };
        transactionStore.push(row);
        return row;
      },
      findOne: async () => null,
      find: async () => [],
    };
    const adapter = {
      getAuthChallenge: async () => ({
        transaction: 'challenge',
        network: 'testnet' as const,
        homeDomain: info.domain,
        expiresAt: null,
      }),
      verifyAuth: async () => ({ token: 'anchor-secret-token', expiresAt: null }),
      startFlow: async () => ({
        protocol: 'sep24' as const,
        interactiveUrl: 'https://anchor.example/interactive',
        transaction: {
          id: 'external-id',
          kind: 'deposit',
          status: 'pending_user',
          statusEta: null,
          amountIn: null,
          amountOut: null,
          amountFee: null,
          assetIn: null,
          assetOut: null,
          stellarTransactionId: null,
          externalTransactionId: null,
          startedAt: null,
          updatedAt: null,
          userActionRequired: true,
          userActionUrl: 'https://anchor.example/interactive',
          rawStatus: 'pending_user',
        },
      }),
      getQuote: async () => {
        throw new Error('unused');
      },
      getTransaction: async () => {
        throw new Error('unused');
      },
      listTransactions: async () => [],
      discover: async () => info,
    };
    const service = new AnchorsService(anchors as never, transactions as never, adapter as never);
    const result = await service.start(info.slug, 'testnet', 'user-id', {
      kind: 'deposit',
      asset: 'USD',
      account,
      amount: '10',
      authToken: 'anchor-secret-token',
    });
    assert.equal(result.localId, 'local-id');
    assert.equal(result.state, 'active');
    assert.equal(result.interactiveUrl, 'https://anchor.example/interactive');
    assert.equal('authToken' in result, false);
    assert.equal(
      (transactionStore[0]?.providerMetadata as { authToken: string }).authToken,
      'anchor-secret-token',
    );
  });
});

describe('HttpAnchorAdapter', () => {
  it('uses the documented SEP-24 interactive endpoint and POST body', async () => {
    const originalFetch = globalThis.fetch;
    let request: { url: string; method?: string; body?: string } | null = null;
    globalThis.fetch = async (input, init) => {
      request = { url: String(input), method: init?.method, body: String(init?.body ?? '') };
      return new Response(
        JSON.stringify({
          id: 'external-id',
          status: 'pending_user',
          url: 'https://anchor.example/interactive',
        }),
        { status: 200, headers: { 'content-type': 'application/json' } },
      );
    };
    try {
      const result = await new HttpAnchorAdapter().startFlow(info, {
        kind: 'deposit',
        asset: 'USD',
        account,
        amount: '10',
        authToken: 'token',
      });
      const captured = request as { url: string; method?: string; body?: string } | null;
      if (!captured) throw new Error('fetch was not called');
      assert.equal(captured.url, 'https://anchor.example/sep24/transactions/deposit/interactive');
      assert.equal(captured.method, 'POST');
      assert.match(captured.body ?? '', /"asset_code":"USD"/);
      assert.equal(result.protocol, 'sep24');
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
