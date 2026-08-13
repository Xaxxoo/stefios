export interface WalletAdapter {
  name: string;
  isAvailable(): boolean;
  getPublicKey(): Promise<string>;
  signMessage(message: string): Promise<string>;
  disconnect?(): Promise<void>;
}
