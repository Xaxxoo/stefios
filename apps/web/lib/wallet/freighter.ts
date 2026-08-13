import {
  getAddress,
  getNetwork,
  isBrowser,
  requestAccess,
  signMessage,
  signTransaction,
  WatchWalletChanges,
} from '@stellar/freighter-api';
import type { StellarNetwork, WalletAdapter, WalletCapability } from './types';

const passphrases: Record<StellarNetwork, string> = {
  mainnet: 'Public Global Stellar Network ; September 2015',
  testnet: 'Test SDF Network ; September 2015',
};

function normalizeNetwork(network: string): StellarNetwork {
  const normalized = network.toLowerCase();
  if (normalized.includes('test')) return 'testnet';
  if (normalized.includes('public') || normalized.includes('main')) return 'mainnet';
  throw new Error('Unsupported Stellar network reported by wallet');
}

function readError(error?: { message?: string }): never | undefined {
  if (error?.message) throw new Error(error.message);
  return undefined;
}

export function createFreighterAdapter(): WalletAdapter {
  let watcher: WatchWalletChanges | null = null;
  return {
    id: 'freighter',
    name: 'Freighter',
    async isAvailable() {
      return isBrowser;
    },
    async connect() {
      const result = await requestAccess();
      readError(result.error);
      if (!result.address) throw new Error('Freighter did not return an account');
    },
    async disconnect() {
      watcher?.stop();
      watcher = null;
    },
    async getPublicKey() {
      const result = await getAddress();
      readError(result.error);
      if (!result.address) throw new Error('Freighter did not return an account');
      return result.address;
    },
    async getNetwork() {
      const result = await getNetwork();
      readError(result.error);
      return normalizeNetwork(result.network);
    },
    async signTransaction(transactionXdr, network) {
      const result = await signTransaction(transactionXdr, {
        networkPassphrase: passphrases[network],
      });
      readError(result.error);
      return result.signedTxXdr;
    },
    async signAuthenticationChallenge(message, network) {
      const result = await signMessage(message, { networkPassphrase: passphrases[network] });
      readError(result.error);
      if (!result.signedMessage)
        throw new Error('Wallet did not return an authentication signature');
      return typeof result.signedMessage === 'string'
        ? result.signedMessage
        : result.signedMessage.toString('base64');
    },
    onAccountChanged(callback) {
      watcher ??= new WatchWalletChanges(1500);
      watcher.watch((result) => {
        if (!result.error && result.address) callback(result.address);
      });
      return () => watcher?.stop();
    },
    onNetworkChanged(callback) {
      watcher ??= new WatchWalletChanges(1500);
      watcher.watch((result) => {
        if (!result.error && result.network) callback(normalizeNetwork(result.network));
      });
      return () => watcher?.stop();
    },
    capabilities(): readonly WalletCapability[] {
      return ['message-signing', 'transaction-signing', 'account-switching'];
    },
  };
}
