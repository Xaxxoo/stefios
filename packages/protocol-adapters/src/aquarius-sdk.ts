import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Networks,
  StrKey,
  TransactionBuilder,
  xdr,
  XdrLargeInt,
} from '@stellar/stellar-sdk';
import type { AssetId, Network } from '@sfo/shared';
import { BaseProtocolAdapter } from './adapter';
import type { QuoteRequest, SwapQuoteSource } from './quote-source';
import type {
  ProtocolCapabilities,
  ProtocolMarket,
  ProtocolMarketMetrics,
  ProtocolPosition,
  ProtocolQuote,
  ProtocolRiskMetrics,
  ProtocolTransactionRequest,
  ProtocolYieldMetrics,
  UnsignedProtocolTransaction,
} from './types';

const SOURCE = '@aquarius/amm-api@official';
const ROUTER = 'aquarius-router';

export type AquariusNetworkConfig = {
  apiUrl: string;
  rpc: string;
  passphrase: string;
  routerContractId: string;
  fee?: string;
  timeoutSeconds?: number;
};
export type AquariusConfig = Readonly<
  Partial<Record<'mainnet' | 'testnet', AquariusNetworkConfig>>
>;

export type AquariusPoolRecord = {
  index?: string;
  address: string;
  tokens_addresses?: readonly string[];
  tokens_str?: readonly string[];
  pool_type?: string;
  fee?: string;
  reserves?: readonly { asset: string; amount: string; decimals?: number }[];
  apr?: string;
  apy?: string;
};
export type AquariusPositionRecord = {
  id: string;
  pool: string;
  shares: string;
  assets: readonly { asset: string; amount: string; decimals?: number }[];
  rewards?: readonly { asset?: string; amount: string }[];
};
export type AquariusDataProvider = {
  listPools(network: Network): Promise<readonly AquariusPoolRecord[]>;
  getUserPositions?(network: Network, account: string): Promise<readonly AquariusPositionRecord[]>;
  quote(request: QuoteRequest): Promise<ProtocolQuote>;
};
export type AquariusSimulationProvider = {
  getAccountSequence(account: string, network: Network): Promise<string>;
  simulate(
    transactionXdr: string,
    network: Network,
  ): Promise<{ status: 'success' | 'failed'; error?: string }>;
};

function decimalToUnits(value: string | undefined, decimals: number): bigint {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value))
    throw new Error('Aquarius amount must be a non-negative decimal');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals) throw new Error(`Aquarius amount exceeds ${decimals} decimals`);
  return (
    BigInt(whole ?? '0') * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
  );
}
function unitsToDecimal(value: bigint, decimals: number): string {
  const raw = value.toString().padStart(decimals + 1, '0');
  const out = decimals === 0 ? raw : `${raw.slice(0, -decimals)}.${raw.slice(-decimals)}`;
  return out.replace(/\.?0+$/, '') || '0';
}
function asAsset(network: Network, address: string): AssetId {
  return { network, type: 'contract', contractAddress: address };
}
function addressForAsset(assetId: AssetId, passphrase: string): string {
  if (assetId.type === 'contract') return assetId.contractAddress!;
  if (assetId.type === 'native') return Asset.native().contractId(passphrase);
  return new Asset(assetId.assetCode!, assetId.issuerAddress!).contractId(passphrase);
}
function addressScVal(address: string): xdr.ScVal {
  return Address.fromString(address).toScVal();
}
function u128(value: string | undefined, decimals = 7): xdr.ScVal {
  return new XdrLargeInt('u128', decimalToUnits(value, decimals)).toU128();
}
function poolIndex(value: string | undefined): xdr.ScVal {
  if (!value || !/^[0-9a-fA-F]{64}$/.test(value))
    throw new Error('Aquarius pool index must be a 32-byte hex value');
  return xdr.ScVal.scvBytes(Buffer.from(value, 'hex'));
}
function slippageFraction(bps: string): string {
  if (!/^\d+$/.test(bps)) throw new Error('Aquarius slippage must be integer basis points');
  const value = BigInt(bps);
  if (value > 10_000n) throw new Error('Aquarius slippage cannot exceed 100%');
  return (
    `${value / 10_000n}.${(value % 10_000n).toString().padStart(4, '0')}`
      .replace(/0+$/, '')
      .replace(/\.$/, '') || '0'
  );
}

export class AquariusSdkAdapter extends BaseProtocolAdapter {
  readonly id = 'aquarius' as const;
  readonly name = 'Aquarius';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'depositLiquidity',
    'withdrawLiquidity',
    'swap',
    'claim',
  );

  constructor(
    private readonly config: AquariusConfig,
    private readonly data: AquariusDataProvider,
    private readonly transactions: AquariusSimulationProvider,
  ) {
    super();
  }

  override async discoverMarkets(network: Network): Promise<readonly ProtocolMarket[]> {
    const pools = await this.data.listPools(network);
    return pools.map((pool) => this.market(network, pool));
  }
  override async getMarket(network: Network, marketId: string): Promise<ProtocolMarket | null> {
    return (
      (await this.data.listPools(network))
        .map((pool) => this.market(network, pool))
        .find((pool) => pool.id === marketId) ?? null
    );
  }
  override async getMarketMetrics(
    network: Network,
    marketId: string,
  ): Promise<ProtocolMarketMetrics | null> {
    const market = await this.getMarket(network, marketId);
    if (!market) return null;
    return {
      marketId,
      tvl: null,
      totalSupply: null,
      totalBorrow: null,
      volume24h: null,
      utilization: null,
      asOf: new Date(),
      source: SOURCE,
      reserves: market.reserves,
    };
  }
  override async getUserPositions(
    network: Network,
    account: string,
  ): Promise<readonly ProtocolPosition[]> {
    const records = (await this.data.getUserPositions?.(network, account)) ?? [];
    return records.map((record) => ({
      id: record.id,
      protocol: 'aquarius' as const,
      marketId: record.pool,
      account,
      kind: 'liquidity' as const,
      assets: record.assets.map((item) => ({
        asset: asAsset(network, item.asset),
        amount: item.amount,
      })),
      value: null,
      healthRatio: null,
      source: SOURCE,
      asOf: new Date(),
      rewards: (record.rewards ?? []).map((reward) => ({
        token: reward.asset ? asAsset(network, reward.asset) : null,
        amount: reward.amount,
        source: SOURCE,
      })),
    }));
  }
  override async getYieldMetrics(network: Network): Promise<readonly ProtocolYieldMetrics[]> {
    const pools = await this.data.listPools(network);
    return pools.flatMap((pool) =>
      pool.apy || pool.apr
        ? [
            {
              protocol: 'aquarius' as const,
              market: pool.address,
              apy: pool.apy ?? pool.apr!,
              tvl: null,
              risk: 'medium' as const,
              asOf: new Date(),
              source: SOURCE,
            },
          ]
        : [],
    );
  }
  override async getRiskMetrics(): Promise<readonly ProtocolRiskMetrics[]> {
    return [];
  }
  getQuote(request: QuoteRequest): Promise<ProtocolQuote> {
    return this.data.quote(request);
  }

  override buildDepositLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.buildLiquidity('depositLiquidity', request);
  }
  override buildWithdrawLiquidityTransaction(request: ProtocolTransactionRequest) {
    return this.buildLiquidity('withdrawLiquidity', request);
  }
  override buildSwapTransaction(request: ProtocolTransactionRequest) {
    return this.buildSwap(request);
  }
  override buildClaimTransaction(request: ProtocolTransactionRequest) {
    return this.buildClaim(request);
  }

  private networkConfig(network: Network): AquariusNetworkConfig {
    if (network !== 'mainnet' && network !== 'testnet')
      throw new Error(`Aquarius does not support ${network}`);
    const config = this.config[network];
    if (!config) throw new Error(`No verified Aquarius configuration for ${network}`);
    return config;
  }
  private market(network: Network, pool: AquariusPoolRecord): ProtocolMarket {
    const assets = (pool.tokens_addresses ?? [])
      .filter((address) => StrKey.isValidContract(address))
      .map((address) => asAsset(network, address));
    const reserves = pool.reserves?.map((reserve) => ({
      asset: asAsset(network, reserve.asset),
      decimals: reserve.decimals ?? 7,
      totalSupply: reserve.amount,
      totalBorrow: null,
      supplyApr: null,
      supplyApy: null,
      borrowApr: null,
      borrowApy: null,
      utilization: null,
      incentives: [],
    }));
    return {
      id: pool.address,
      protocol: 'aquarius',
      network,
      name: pool.tokens_str?.join(' / ') ?? pool.address,
      assets,
      category: 'liquidity',
      enabled: true,
      source: SOURCE,
      asOf: new Date(),
      ...(reserves ? { reserves } : {}),
      poolType: pool.pool_type ?? null,
      fee: pool.fee ?? null,
    };
  }
  private async transactionBase(
    operation: 'depositLiquidity' | 'withdrawLiquidity' | 'swap' | 'claim',
    request: ProtocolTransactionRequest,
    xdrOperation: xdr.Operation,
  ): Promise<
    UnsignedProtocolTransaction & { status: 'simulated'; transactionXdr: string; preview: unknown }
  > {
    const config = this.networkConfig(request.network);
    const sequence = await this.transactions.getAccountSequence(request.account, request.network);
    const tx = new TransactionBuilder(new Account(request.account, sequence), {
      fee: config.fee ?? BASE_FEE,
      networkPassphrase:
        config.passphrase || (request.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET),
    })
      .addOperation(xdrOperation)
      .setTimeout(config.timeoutSeconds ?? 300)
      .build();
    const transactionXdr = tx.toXDR();
    const simulation = await this.transactions.simulate(transactionXdr, request.network);
    if (simulation.status !== 'success')
      throw new Error(
        `Aquarius transaction simulation failed: ${simulation.error ?? 'unknown error'}`,
      );
    return {
      protocol: 'aquarius',
      operation,
      network: request.network,
      sourceAccount: request.account,
      marketId: request.marketId ?? null,
      asset: request.asset ?? null,
      amount: request.amount ?? null,
      quoteAsset: request.quoteAsset ?? null,
      minReceived: request.minReceived ?? null,
      slippageBps: request.slippageBps ?? null,
      destination: request.destination ?? null,
      positionId: request.positionId ?? null,
      decimals: request.decimals ?? null,
      reserveTokenIds: [],
      requiredSigners: [request.account],
      status: 'simulated',
      transactionXdr,
      preview: {
        title: `Aquarius ${operation}`,
        summary: `Simulated ${operation} for ${request.marketId ?? 'selected pool'}`,
        warnings: ['Review the route, slippage, and contract call in your wallet before signing.'],
        simulation,
      },
    };
  }
  private async buildLiquidity(
    operation: 'depositLiquidity' | 'withdrawLiquidity',
    request: ProtocolTransactionRequest,
  ) {
    const config = this.networkConfig(request.network);
    const tokens = request.tokenAssets ?? [];
    if (!request.marketId || !request.poolIndex || tokens.length === 0)
      throw new Error('Aquarius liquidity transactions require pool, pool index, and token assets');
    const contract = new Contract(request.marketId);
    const args = [
      addressScVal(request.account),
      xdr.ScVal.scvVec(
        tokens.map((token) => addressScVal(addressForAsset(token, config.passphrase))),
      ),
      poolIndex(request.poolIndex),
    ];
    const operationXdr =
      operation === 'depositLiquidity'
        ? contract.call(
            'deposit',
            ...args,
            xdr.ScVal.scvVec(
              (request.amounts ?? []).map((amount) => u128(amount, request.decimals ?? 7)),
            ),
            u128(request.minShares, request.decimals ?? 7),
          )
        : contract.call(
            'withdraw',
            ...args,
            u128(request.amount, request.decimals ?? 7),
            xdr.ScVal.scvVec(
              (request.minAmounts ?? []).map((amount) => u128(amount, request.decimals ?? 7)),
            ),
          );
    return this.transactionBase(operation, request, operationXdr);
  }
  private async buildClaim(request: ProtocolTransactionRequest) {
    if (!request.marketId) throw new Error('Aquarius claim requires a pool address');
    return this.transactionBase(
      'claim',
      request,
      new Contract(request.marketId).call('claim', addressScVal(request.account)),
    );
  }
  private async buildSwap(request: ProtocolTransactionRequest) {
    const config = this.networkConfig(request.network);
    if (!request.asset || !request.quoteAsset)
      throw new Error('Aquarius swap requires tokenIn and tokenOut');
    const quote = await this.data.quote({
      network: request.network,
      tokenIn: request.asset,
      tokenOut: request.quoteAsset,
      amountIn: request.amount ?? '',
      slippageBps: request.slippageBps ?? '50',
      decimals: request.decimals ?? 7,
      strictReceive: Boolean(request.minReceived),
    });
    if (quote.stale || Date.now() - quote.quotedAt.getTime() > 30_000)
      throw new Error('Aquarius quote became stale before transaction construction');
    const fn = request.minReceived ? 'swap_chained_strict_receive' : 'swap_chained';
    const operationXdr = new Contract(config.routerContractId).call(
      fn,
      addressScVal(request.account),
      xdr.ScVal.fromXDR(quote.routeXdr, 'base64'),
      addressScVal(addressForAsset(request.asset, config.passphrase)),
      u128(request.amount, request.decimals ?? 7),
      u128(request.minReceived ?? quote.amountOut, request.decimals ?? 7),
    );
    const prepared = await this.transactionBase('swap', { ...request, quote }, operationXdr);
    return { ...prepared, quote };
  }
}

export class AquariusHttpProvider implements AquariusDataProvider, SwapQuoteSource {
  readonly id = ROUTER;
  constructor(private readonly configs: AquariusConfig) {}
  async listPools(network: Network): Promise<readonly AquariusPoolRecord[]> {
    const config = this.config(network);
    const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/pools/`);
    if (!response.ok) throw new Error(`Aquarius pool API returned ${response.status}`);
    const body = (await response.json()) as { results?: AquariusPoolRecord[] };
    return body.results ?? [];
  }
  async quote(request: QuoteRequest): Promise<ProtocolQuote> {
    const config = this.config(request.network);
    const decimals = request.decimals ?? 7;
    const body = {
      token_in_address: addressForAsset(request.tokenIn, config.passphrase),
      token_out_address: addressForAsset(request.tokenOut, config.passphrase),
      amount: decimalToUnits(request.amountIn, decimals).toString(),
      slippage: slippageFraction(request.slippageBps),
    };
    const endpoint = request.strictReceive ? 'find-path-strict-receive/' : 'find-path/';
    const response = await fetch(`${config.apiUrl.replace(/\/$/, '')}/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!response.ok) throw new Error(`Aquarius quote API returned ${response.status}`);
    const result = (await response.json()) as {
      success?: boolean;
      amount?: number | string;
      swap_chain_xdr?: string;
      pools?: string[];
      price_impact?: number | string;
    };
    if (!result.success || result.amount == null || !result.swap_chain_xdr)
      throw new Error('Aquarius returned no executable route');
    if (
      typeof result.amount === 'number' &&
      (!Number.isSafeInteger(result.amount) || result.amount < 0)
    )
      throw new Error('Aquarius returned an unsafe numeric amount');
    if (typeof result.price_impact === 'number' && !Number.isFinite(result.price_impact))
      throw new Error('Aquarius returned an invalid price impact');
    return {
      protocol: 'aquarius',
      network: request.network,
      tokenIn: request.tokenIn,
      tokenOut: request.tokenOut,
      amountIn: request.amountIn,
      amountOut: unitsToDecimal(BigInt(String(result.amount)), decimals),
      route: result.pools ?? [],
      routeXdr: result.swap_chain_xdr,
      priceImpact: result.price_impact == null ? null : String(result.price_impact),
      slippageBps: request.slippageBps,
      source: SOURCE,
      quotedAt: new Date(),
      stale: false,
    };
  }
  private config(network: Network) {
    const config = this.configs[network as 'mainnet' | 'testnet'];
    if (!config) throw new Error(`No verified Aquarius configuration for ${network}`);
    return config;
  }
}
