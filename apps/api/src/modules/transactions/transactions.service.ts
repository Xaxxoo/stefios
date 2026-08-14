import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { AssetAmount, TransactionAction, TransactionIntent } from '@sfo/shared';
import type {
  ProtocolAdapter,
  ProtocolRegistry,
  ProtocolTransactionRequest,
  QuoteRequest,
  UnsignedProtocolTransaction,
} from '@sfo/protocol-adapters';
import { aggregateSwapQuotes } from '@sfo/protocol-adapters';
import type { StellarTransactionProvider, TransactionSubmissionProvider } from '@sfo/stellar';
import { PROTOCOL_REGISTRY } from '../protocols/protocols.tokens';
import { STELLAR_RPC_PROVIDER } from '../stellar/stellar.module';

type ComposerRequest = ProtocolTransactionRequest & {
  protocol: string;
  action: TransactionAction;
  quoteExpiresAt?: string;
};
type Prepared = UnsignedProtocolTransaction & {
  status: 'simulated';
  transactionXdr: string;
  preview?: {
    title?: string;
    summary?: string;
    warnings?: readonly string[];
    simulation?: unknown;
  };
  quote?: {
    amountOut?: string;
    priceImpact?: string | null;
    slippageBps?: string;
    tokenOut?: AssetAmount['asset'];
  };
};

@Injectable()
export class TransactionsService {
  constructor(
    @Inject(PROTOCOL_REGISTRY) private readonly registry: ProtocolRegistry,
    @Inject(STELLAR_RPC_PROVIDER)
    private readonly stellar: StellarTransactionProvider & TransactionSubmissionProvider,
    private readonly config: ConfigService,
  ) {}

  async compose(request: ComposerRequest) {
    if (request.network !== this.config.get<'mainnet' | 'testnet'>('app.stellarNetwork', 'testnet'))
      throw new BadRequestException(
        'Transaction network does not match the configured Stellar network',
      );
    if (
      request.action === 'swap' &&
      request.quoteExpiresAt &&
      Date.now() >= new Date(request.quoteExpiresAt).getTime()
    )
      throw new BadRequestException(
        'Selected swap quote has expired. Refresh quotes before composing.',
      );
    const adapter = this.adapter(request.protocol);
    const builder = this.builder(adapter, request.action);
    const prepared = (await builder(request)) as Prepared;
    if (prepared.status !== 'simulated' || !prepared.transactionXdr)
      throw new ServiceUnavailableException('This action did not produce a simulated transaction');
    const intent = this.intent(request, prepared);
    return {
      lifecycle: 'previewed' as const,
      intent,
      transactionXdr: prepared.transactionXdr,
      preview: {
        title: prepared.preview?.title ?? `${request.protocol} ${request.action}`,
        summary: prepared.preview?.summary ?? this.summary(request),
        warnings: [...(prepared.preview?.warnings ?? []), ...intent.warnings],
        simulation: prepared.preview?.simulation ?? { status: 'success' },
        decoded: this.decode(request, prepared),
      },
    };
  }

  async submit(network: 'mainnet' | 'testnet', signedTransactionXdr: string) {
    if (network !== this.config.get<'mainnet' | 'testnet'>('app.stellarNetwork', 'testnet'))
      throw new BadRequestException(
        'Transaction network does not match the configured Stellar network',
      );
    if (!signedTransactionXdr || signedTransactionXdr.length > 100_000)
      throw new BadRequestException('A signed transaction XDR is required');
    const result = await this.stellar.submitAlreadySignedTransaction(signedTransactionXdr);
    const response = result as unknown as { status?: string; hash?: string; errorResult?: unknown };
    if (response.status === 'ERROR')
      throw new BadRequestException(response.errorResult ?? 'Transaction submission failed');
    if (!response.hash)
      throw new ServiceUnavailableException('Stellar submission returned no transaction hash');
    return { lifecycle: 'submitted' as const, hash: response.hash, network };
  }

  monitor(hash: string) {
    return this.stellar.getTransaction(hash);
  }

  quotes(request: QuoteRequest) {
    if (request.network !== this.config.get<'mainnet' | 'testnet'>('app.stellarNetwork', 'testnet'))
      throw new BadRequestException('Quote network does not match the configured Stellar network');
    return aggregateSwapQuotes(this.registry.list(), request);
  }

  private adapter(protocol: string): ProtocolAdapter {
    try {
      return this.registry.get(protocol as Parameters<ProtocolRegistry['get']>[0]);
    } catch {
      throw new BadRequestException(`Unknown protocol: ${protocol}`);
    }
  }

  private builder(adapter: ProtocolAdapter, action: TransactionAction) {
    const builders: Record<
      TransactionAction,
      (request: ProtocolTransactionRequest) => Promise<unknown>
    > = {
      supply: adapter.buildSupplyTransaction.bind(adapter),
      withdraw: adapter.buildWithdrawTransaction.bind(adapter),
      borrow: adapter.buildBorrowTransaction.bind(adapter),
      repay: adapter.buildRepayTransaction.bind(adapter),
      depositLiquidity: adapter.buildDepositLiquidityTransaction.bind(adapter),
      withdrawLiquidity: adapter.buildWithdrawLiquidityTransaction.bind(adapter),
      claim: adapter.buildClaimTransaction.bind(adapter),
      swap: adapter.buildSwapTransaction.bind(adapter),
    };
    if (!adapter.capabilities[action])
      throw new BadRequestException(`${adapter.name} does not support ${action}`);
    return builders[action];
  }

  private intent(request: ComposerRequest, prepared: Prepared): TransactionIntent {
    const inputAssets: AssetAmount[] =
      request.asset && request.amount ? [{ asset: request.asset, amount: request.amount }] : [];
    const quote = prepared.quote;
    const outputAssets: AssetAmount[] =
      request.quoteAsset && quote?.amountOut
        ? [{ asset: request.quoteAsset, amount: quote.amountOut }]
        : [];
    const minimumOutputs: AssetAmount[] =
      request.quoteAsset && request.minReceived
        ? [{ asset: request.quoteAsset, amount: request.minReceived }]
        : [];
    const warnings = ['Review the simulated transaction and wallet confirmation before signing.'];
    if (request.action === 'swap' && !quote)
      warnings.push('Quote details were not returned by the provider.');
    if (!inputAssets.length && request.action !== 'claim')
      warnings.push('Input asset details are unavailable in this request.');
    return {
      action: request.action,
      protocol: request.protocol,
      network: request.network,
      inputAssets,
      outputAssets,
      expectedOutputs: outputAssets,
      minimumOutputs,
      fees: [],
      priceImpact: quote?.priceImpact ?? null,
      slippage: quote?.slippageBps ?? request.slippageBps ?? null,
      contractCalls: [
        {
          target: prepared.asset?.contractAddress ?? null,
          method: request.action,
          description: `${request.protocol} ${request.action}`,
        },
      ],
      expiration: new Date(Date.now() + 5 * 60 * 1000),
      warnings,
    };
  }

  private summary(request: ComposerRequest) {
    return `${request.action} on ${request.protocol}. The connected wallet must approve and sign this transaction.`;
  }

  private decode(request: ComposerRequest, prepared: Prepared) {
    return {
      action: request.action,
      protocol: request.protocol,
      sourceAccount: prepared.sourceAccount,
      operation: prepared.operation,
      contract: prepared.asset?.contractAddress ?? null,
      amount: prepared.amount,
      note: 'Decoded from the normalized intent and provider preview; no private key is handled by the API.',
    };
  }
}
