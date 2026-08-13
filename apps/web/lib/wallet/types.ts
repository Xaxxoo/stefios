export type StellarNetwork = 'testnet' | 'mainnet';

export type WalletCapability =
  'message-signing' | 'transaction-signing' | 'network-switching' | 'account-switching';

export interface WalletProvider {
  readonly id: string;
  readonly name: string;
  readonly icon?: string;
  isAvailable(): Promise<boolean>;
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  getPublicKey(): Promise<string>;
  getNetwork(): Promise<StellarNetwork>;
  signTransaction(transactionXdr: string, network: StellarNetwork): Promise<string>;
  signAuthenticationChallenge(message: string, network: StellarNetwork): Promise<string>;
  onAccountChanged(callback: (address: string) => void): () => void;
  onNetworkChanged(callback: (network: StellarNetwork) => void): () => void;
  capabilities(): readonly WalletCapability[];
}

export type WalletAdapter = WalletProvider;
