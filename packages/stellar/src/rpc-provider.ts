import { Asset, FeeBumpTransaction, Networks, Transaction, xdr } from '@stellar/stellar-sdk';
import { Server, type Api, Durability } from '@stellar/stellar-sdk/rpc';
import type {
  ContractDataKeyXdr,
  FeeInformation,
  LedgerKeyXdr,
  NormalizedAccount,
  NormalizedLedger,
  SignedTransactionXdr,
  StellarNetwork,
  StellarProviderHealth,
} from './types';
import { StellarProviderError } from './types';
import type {
  ProviderErrorNormalizer,
  StellarAccountProvider,
  StellarLedgerProvider,
  StellarRpcProvider,
  StellarTokenProvider,
  StellarTransactionProvider,
  TransactionSimulationProvider,
  TransactionSubmissionProvider,
} from './providers';

export interface StellarRpcProviderOptions {
  network: StellarNetwork;
  rpcUrl: string;
  timeoutMs?: number;
  maxRetries?: number;
  backoffMs?: number;
  server?: Server;
}

const networkPassphrase = (network: StellarNetwork): string =>
  network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET;

export const normalizeProviderError: ProviderErrorNormalizer = (error) => {
  const candidate = error as {
    message?: string;
    code?: string | number;
    status?: number;
    statusCode?: number;
    response?: { status?: number };
    name?: string;
  };
  const statusCode = candidate.statusCode ?? candidate.status ?? candidate.response?.status;
  const message = candidate.message ?? 'Stellar provider request failed';
  const code = String(candidate.code ?? candidate.name ?? 'STELLAR_PROVIDER_ERROR');
  const retryable =
    statusCode === 408 ||
    statusCode === 429 ||
    statusCode === 500 ||
    statusCode === 502 ||
    statusCode === 503 ||
    statusCode === 504 ||
    /timeout|temporar|rate.?limit|network/i.test(message);
  return { code, message, retryable, statusCode, cause: error };
};

export class StellarRpcClient
  implements
    StellarRpcProvider,
    StellarAccountProvider,
    StellarTransactionProvider,
    StellarLedgerProvider,
    StellarTokenProvider,
    TransactionSimulationProvider,
    TransactionSubmissionProvider
{
  readonly server: Server;
  private readonly timeoutMs: number;
  private readonly maxRetries: number;
  private readonly backoffMs: number;
  private readonly network: StellarNetwork;

  constructor(options: StellarRpcProviderOptions) {
    this.network = options.network;
    this.server = options.server ?? new Server(options.rpcUrl);
    this.timeoutMs = options.timeoutMs ?? 10_000;
    this.maxRetries = options.maxRetries ?? 2;
    this.backoffMs = options.backoffMs ?? 200;
  }

  private async execute<T>(operation: () => Promise<T>): Promise<T> {
    let attempt = 0;
    while (true) {
      try {
        return await Promise.race([
          operation(),
          new Promise<never>((_, reject) =>
            setTimeout(
              () => reject(new Error('Stellar provider request timed out')),
              this.timeoutMs,
            ),
          ),
        ]);
      } catch (error) {
        const normalized = normalizeProviderError(error);
        if (!normalized.retryable || attempt >= this.maxRetries)
          throw new StellarProviderError(normalized);
        await new Promise((resolve) => setTimeout(resolve, this.backoffMs * 2 ** attempt));
        attempt += 1;
      }
    }
  }

  async getHealth(): Promise<StellarProviderHealth> {
    const started = Date.now();
    try {
      await this.execute(() => this.server.getHealth());
      return {
        provider: 'stellar-rpc',
        network: this.network,
        status: 'up',
        latencyMs: Date.now() - started,
      };
    } catch (error) {
      const normalized = normalizeProviderError(error);
      return {
        provider: 'stellar-rpc',
        network: this.network,
        status: 'down',
        latencyMs: Date.now() - started,
        error: normalized.message,
      };
    }
  }

  getNetwork(): Promise<unknown> {
    return this.execute(() => this.server.getNetwork());
  }
  async getLatestLedger(): Promise<NormalizedLedger> {
    return this.normalizeLedger(await this.execute(() => this.server.getLatestLedger()));
  }
  async getLedger(sequence: number): Promise<NormalizedLedger | undefined> {
    const result = await this.execute(() =>
      this.server.getLedgers({ startLedger: sequence, pagination: { limit: 1 } }),
    );
    const ledger = result.ledgers[0];
    return ledger ? this.normalizeLedger(ledger) : undefined;
  }
  async getLedgerEntries(keys: readonly LedgerKeyXdr[]): Promise<readonly unknown[]> {
    return (
      await this.execute(() =>
        this.server.getLedgerEntries(...keys.map((key) => xdr.LedgerKey.fromXDR(key, 'base64'))),
      )
    ).entries;
  }
  async getContractData(contractAddress: string, key: ContractDataKeyXdr): Promise<unknown> {
    return this.execute(() =>
      this.server.getContractData(
        contractAddress,
        xdr.ScVal.fromXDR(key, 'base64'),
        Durability.Persistent,
      ),
    );
  }
  async getAccount(address: string): Promise<NormalizedAccount> {
    const account = await this.execute(() => this.server.getAccount(address));
    return { address, sequence: account.sequenceNumber(), balances: [], raw: account };
  }
  getTransaction(hash: string): Promise<unknown> {
    return this.execute(() => this.server.getTransaction(hash));
  }
  getTransactions(startLedger: number, cursor?: string, limit?: number): Promise<unknown> {
    return this.execute(() =>
      this.server.getTransactions(
        cursor ? { pagination: { cursor, limit } } : { startLedger, pagination: { limit } },
      ),
    );
  }
  getTokenBalance(accountAddress: string, asset: string): Promise<unknown> {
    return this.execute(() =>
      this.server.getAssetBalance(
        accountAddress,
        asset.toUpperCase() === 'XLM'
          ? Asset.native()
          : new Asset(asset.split(':')[0] ?? '', asset.split(':')[1] ?? ''),
      ),
    );
  }
  async simulate(transactionXdr: string): Promise<Api.SimulateTransactionResponse> {
    return this.simulateTransaction(transactionXdr);
  }
  async simulateTransaction(transactionXdr: string): Promise<Api.SimulateTransactionResponse> {
    return this.execute(() =>
      this.server.simulateTransaction(this.parseSignedOrUnsignedTransaction(transactionXdr)),
    );
  }
  async getFeeInformation(): Promise<FeeInformation> {
    const raw = await this.execute(() => this.server.getFeeStats());
    return {
      sorobanInclusionFee: raw.sorobanInclusionFee.p99,
      minResourceFee: raw.sorobanInclusionFee.min,
      raw,
    };
  }
  async submitAlreadySignedTransaction(
    signedTransactionXdr: SignedTransactionXdr,
  ): Promise<Api.SendTransactionResponse> {
    return this.execute(() =>
      this.server.sendTransaction(this.parseSignedOrUnsignedTransaction(signedTransactionXdr)),
    );
  }

  private parseSignedOrUnsignedTransaction(
    transactionXdr: string,
  ): Transaction | FeeBumpTransaction {
    try {
      return new Transaction(transactionXdr, networkPassphrase(this.network));
    } catch {
      return new FeeBumpTransaction(transactionXdr, networkPassphrase(this.network));
    }
  }

  private normalizeLedger(
    ledger: Api.GetLatestLedgerResponse | Api.GetLedgersResponse['ledgers'][number],
  ): NormalizedLedger {
    return {
      sequence: ledger.sequence,
      hash: 'hash' in ledger ? ledger.hash : String(ledger.id),
      closeTime: 'closeTime' in ledger ? String(ledger.closeTime) : '',
      raw: ledger,
    };
  }
}
