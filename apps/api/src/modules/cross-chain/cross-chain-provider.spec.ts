import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { CrossChainProviderRegistry, UnavailableCrossChainProvider } from './cross-chain-provider';

describe('CrossChainProviderRegistry', () => {
  it('does not imply bridge availability when no provider is configured', async () => {
    const registry = new CrossChainProviderRegistry([new UnavailableCrossChainProvider()]);
    assert.deepEqual(registry.list(), [{ id: 'unconfigured', chains: [], available: false }]);
    await assert.rejects(registry.get('unconfigured').getTransfer('external-id'));
  });
});
