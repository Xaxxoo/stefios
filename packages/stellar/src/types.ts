import type { Api } from '@stellar/stellar-sdk/rpc';

export type StellarNetwork = 'testnet' | 'mainnet';
export type SignedTransactionXdr = string;
export type ContractDataKeyXdr = string;
export type LedgerKeyXdr = string;

export interface StellarProviderHealth {
  provider: string;
  network: StellarNetwork;
  status: 'up' | 'down';
  latencyMs?: number;
  error?: string;
}

export interface NormalizedAccount {
  address: string;
  sequence: string;
  balances: readonly unknown[];
  raw: unknown;
}

export interface NormalizedLedger {
  sequence: number;
  hash: string | null;
  closeTime: string;
  raw: unknown;
}

export interface FeeInformation {
  sorobanInclusionFee: string;
  minResourceFee: string;
  raw: Api.GetFeeStatsResponse;
}

export interface ProviderErrorShape {
  code: string;
  message: string;
  retryable: boolean;
  statusCode?: number;
  cause?: unknown;
}

export class StellarProviderError extends Error {
  readonly code: string;
  readonly retryable: boolean;
  readonly statusCode?: number;
  override readonly cause?: unknown;

  constructor(error: ProviderErrorShape) {
    super(error.message);
    this.name = 'StellarProviderError';
    this.code = error.code;
    this.retryable = error.retryable;
    this.statusCode = error.statusCode;
    this.cause = error.cause;
  }
}
