import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalAssetId, parseCanonicalAssetId } from '../src/modules/assets/asset-identity';
import { sanitizeAssetMetadata } from '../src/modules/assets/metadata';

const issuer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const contract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2JEO';

describe('asset identity and metadata safety', () => {
  it('creates distinct canonical identities for same-symbol assets', () => {
    const a = canonicalAssetId({
      network: 'mainnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
    const b = canonicalAssetId({
      network: 'testnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
    assert.notEqual(a, b);
    assert.deepEqual(parseCanonicalAssetId(a), {
      network: 'mainnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
  });

  it('supports native, classic, and contract identities', () => {
    assert.equal(canonicalAssetId({ network: 'mainnet', type: 'native' }), 'mainnet:native');
    assert.match(
      canonicalAssetId({
        network: 'mainnet',
        type: 'classic',
        assetCode: 'BENJI',
        issuerAddress: issuer,
      }),
      /^mainnet:classic:/,
    );
    assert.equal(
      canonicalAssetId({ network: 'mainnet', type: 'contract', contractAddress: contract }),
      `mainnet:contract:${contract}`,
    );
  });

  it('does not verify metadata from a symbol alone and sanitizes unsafe fields', () => {
    const result = sanitizeAssetMetadata(
      {
        symbol: 'USDC',
        description: '<script>alert(1)</script>\u0000',
        logo: 'javascript:alert(1)',
        links: ['https://issuer.example/info', 'http://unsafe.example'],
      },
      { issuer },
      false,
    );
    assert.equal(result.symbol, 'USDC');
    assert.equal(result.verification, 'unverified');
    assert.equal(result.logo, undefined);
    assert.deepEqual(result.links, ['https://issuer.example/info']);
    assert.equal(result.description?.includes('\u0000'), false);
  });
});
