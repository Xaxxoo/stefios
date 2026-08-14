import {
  BadRequestException,
  Inject,
  Injectable,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import {
  Account,
  Asset,
  Memo,
  Networks,
  Operation,
  TransactionBuilder,
} from '@stellar/stellar-sdk';
import type { AssetAmount, TransactionAction, TransactionIntent } from '@sfo/shared';
import type {
  ProtocolAdapter,
  ProtocolRegistry,
  ProtocolTransactionRequest,
  QuoteRequest,
  UnsignedProtocolTransaction,
} from '@sfo/protocol-adapters';
import { aggregateSwapQuotes } from '@sfo/protocol-adapters';
import type {
  StellarAccountProvider,
  StellarRpcProvider,
  TransactionSimulationProvider,
  StellarTransactionProvider,
  TransactionSubmissionProvider,
} from '@sfo/stellar';
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
    private readonly stellar: StellarRpcProvider &
      StellarAccountProvider &
      TransactionSimulationProvider &
      StellarTransactionProvider &
      TransactionSubmissionProvider,
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
    const adapter = request.action === 'payment' ? null : this.adapter(request.protocol);
    const prepared = (
      request.action === 'payment'
        ? await this.buildPayment(request)
        : await this.builder(adapter!, request.action)(request)
    ) as Prepared;
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
      payment: async () => {
        throw new BadRequestException(
          'Payment construction is handled by the Stellar payment composer',
        );
      },
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

  private async buildPayment(request: ComposerRequest): Promise<Prepared> {
    if (!request.asset || !request.amount || !request.destination)
      throw new BadRequestException('Payment requires asset, amount, and recipient');
    if (request.asset.type === 'contract')
      throw new BadRequestException('Contract-token payments require a verified protocol route');
    const account = await this.stellar.getAccount(request.account);
    const asset =
      request.asset.type === 'native'
        ? Asset.native()
        : new Asset(request.asset.assetCode!, request.asset.issuerAddress!);
    const destination = request.destination;
    const operation =
      request.pathMode === 'strictReceive'
        ? Operation.pathPaymentStrictReceive({
            sendAsset: asset,
            sendMax: request.sendMax ?? request.amount,
            destAsset: request.quoteAsset ? this.stellarAsset(request.quoteAsset) : asset,
            destAmount: request.destAmount ?? request.amount,
            destination,
            path: (request.path ?? []).map((item) => this.stellarAsset(item)),
          })
        : request.quoteAsset
          ? Operation.pathPaymentStrictSend({
              sendAsset: asset,
              sendAmount: request.amount,
              destAsset: this.stellarAsset(request.quoteAsset),
              destMin: request.destMin ?? request.minReceived ?? request.amount,
              destination,
              path: (request.path ?? []).map((item) => this.stellarAsset(item)),
            })
          : Operation.payment({ destination, asset, amount: request.amount });
    const builder = new TransactionBuilder(new Account(request.account, account.sequence), {
      fee: '100',
      networkPassphrase: request.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET,
    })
      .addOperation(operation)
      .setTimeout(300);
    if (request.memo) builder.addMemo(Memo.text(request.memo));
    const transactionXdr = builder.build().toXDR();
    const simulation = await this.stellar.simulate(transactionXdr);
    if ('error' in simulation && simulation.error)
      throw new BadRequestException(`Payment simulation failed: ${String(simulation.error)}`);
    return {
      protocol: 'stellar',
      operation: 'payment',
      network: request.network,
      sourceAccount: request.account,
      marketId: null,
      asset: request.asset,
      amount: request.amount,
      quoteAsset: request.quoteAsset ?? null,
      minReceived: request.destMin ?? request.minReceived ?? null,
      slippageBps: request.slippageBps ?? null,
      destination,
      positionId: null,
      decimals: request.decimals ?? null,
      reserveTokenIds: [],
      requiredSigners: [request.account],
      status: 'simulated',
      transactionXdr,
      preview: {
        title: request.quoteAsset ? 'Stellar path payment' : 'Stellar payment',
        summary: `${request.amount} ${request.asset.type === 'native' ? 'XLM' : request.asset.assetCode} to ${destination}`,
        warnings: ['Verify the recipient, asset issuer, memo, and path before signing.'],
        simulation,
      },
    };
  }

  private stellarAsset(asset: NonNullable<ProtocolTransactionRequest['asset']>) {
    if (asset.type === 'native') return Asset.native();
    if (asset.type === 'classic') return new Asset(asset.assetCode!, asset.issuerAddress!);
    throw new BadRequestException(
      'Contract assets cannot be used in classic Stellar path payments',
    );
  }

  private intent(request: ComposerRequest, prepared: Prepared): TransactionIntent {
    const inputAssets: AssetAmount[] =
      request.asset && request.amount ? [{ asset: request.asset, amount: request.amount }] : [];
    const quote = prepared.quote;
    const paymentOutputAsset =
      request.action === 'payment' ? (request.quoteAsset ?? request.asset) : undefined;
    const paymentExpectedAmount =
      request.action === 'payment'
        ? request.quoteAsset
          ? request.pathMode === 'strictReceive'
            ? request.destAmount
            : undefined
          : request.amount
        : undefined;
    const paymentMinimumAmount =
      request.action === 'payment'
        ? request.quoteAsset
          ? request.pathMode === 'strictReceive'
            ? request.destAmount
            : (request.destMin ?? request.minReceived)
          : request.amount
        : undefined;
    const outputAssets: AssetAmount[] =
      paymentOutputAsset && (quote?.amountOut ?? paymentExpectedAmount)
        ? [{ asset: paymentOutputAsset, amount: quote?.amountOut ?? paymentExpectedAmount! }]
        : [];
    const minimumOutputs: AssetAmount[] =
      paymentOutputAsset && paymentMinimumAmount
        ? [{ asset: paymentOutputAsset, amount: paymentMinimumAmount }]
        : request.quoteAsset && request.minReceived
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
