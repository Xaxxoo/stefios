import type { Api } from '@stellar/stellar-sdk/rpc';
import type {
  ContractDataKeyXdr,
  FeeInformation,
  LedgerKeyXdr,
  NormalizedAccount,
  NormalizedLedger,
  ProviderErrorShape,
  SignedTransactionXdr,
  StellarProviderHealth,
} from './types';

export interface StellarRpcProvider {
  getHealth(): Promise<StellarProviderHealth>;
  getNetwork(): Promise<unknown>;
  getLatestLedger(): Promise<NormalizedLedger>;
  getLedgerEntries(keys: readonly LedgerKeyXdr[]): Promise<readonly unknown[]>;
  getContractData(contractAddress: string, key: ContractDataKeyXdr): Promise<unknown>;
  simulateTransaction(
    signedOrUnsignedTransactionXdr: string,
  ): Promise<Api.SimulateTransactionResponse>;
  getFeeInformation(): Promise<FeeInformation>;
}

export interface StellarAccountProvider {
  getAccount(address: string): Promise<NormalizedAccount>;
}

export interface StellarTransactionProvider {
  getTransaction(hash: string): Promise<unknown>;
  getTransactions(startLedger: number, cursor?: string, limit?: number): Promise<unknown>;
}

export interface StellarLedgerProvider {
  getLedger(sequence: number): Promise<NormalizedLedger | undefined>;
  getLatestLedger(): Promise<NormalizedLedger>;
}

export interface StellarTokenProvider {
  getTokenBalance(accountAddress: string, asset: string): Promise<unknown>;
  getContractData(contractAddress: string, key: ContractDataKeyXdr): Promise<unknown>;
}

export interface HistoricalDataProvider {
  getTransactionHistory(accountAddress: string, cursor?: string): Promise<unknown>;
}

export interface PortfolioDataProvider {
  getPortfolioData(accountAddress: string): Promise<unknown>;
}

export interface TokenMetadataProvider {
  getTokenMetadata(asset: string): Promise<unknown>;
}

export interface TransactionSimulationProvider {
  simulate(signedOrUnsignedTransactionXdr: string): Promise<Api.SimulateTransactionResponse>;
}

export interface TransactionSubmissionProvider {
  submitAlreadySignedTransaction(
    signedTransactionXdr: SignedTransactionXdr,
  ): Promise<Api.SendTransactionResponse>;
}

export type ProviderErrorNormalizer = (error: unknown) => ProviderErrorShape;
