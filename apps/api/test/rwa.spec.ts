import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { canonicalAssetId, parseCanonicalAssetId } from '../src/modules/assets/asset-identity';

const issuer = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF';
const contract = 'CAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA2JEO';

describe('RWA canonical identity semantics', () => {
  it('requires issuer or contract identity and never accepts a ticker alone', () => {
    assert.throws(
      () => parseCanonicalAssetId('mainnet:classic:BENJI'),
      /Invalid canonical asset identity/,
    );
    assert.equal(
      canonicalAssetId({
        network: 'mainnet',
        type: 'classic',
        assetCode: 'BENJI',
        issuerAddress: issuer,
      }),
      `mainnet:classic:BENJI:${issuer}`,
    );
    assert.equal(
      canonicalAssetId({ network: 'mainnet', type: 'contract', contractAddress: contract }),
      `mainnet:contract:${contract}`,
    );
  });

  it('keeps identical product symbols distinct across network and issuer', () => {
    const mainnet = canonicalAssetId({
      network: 'mainnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
    const testnet = canonicalAssetId({
      network: 'testnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
    assert.notEqual(mainnet, testnet);
    assert.deepEqual(parseCanonicalAssetId(mainnet), {
      network: 'mainnet',
      type: 'classic',
      assetCode: 'USDC',
      issuerAddress: issuer,
    });
  });
});
