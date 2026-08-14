import {
  PoolContractV2,
  PoolV2,
  PositionsEstimate,
  RequestType,
  type Network as BlendNetwork,
  type Pool,
  type Reserve,
} from '@blend-capital/blend-sdk';
import { Account, Networks, TransactionBuilder, xdr } from '@stellar/stellar-sdk';
import type { AssetId, Network } from '@sfo/shared';
import { BaseProtocolAdapter } from './adapter';
import type {
  ProtocolCapabilities,
  ProtocolIncentive,
  ProtocolMarket,
  ProtocolMarketMetrics,
  ProtocolPosition,
  ProtocolReserveMetrics,
  ProtocolReward,
  ProtocolRiskMetrics,
  ProtocolTransactionRequest,
  UnsignedProtocolTransaction,
} from './types';

export type BlendNetworkConfig = {
  rpc: string;
  passphrase: string;
  poolIds: readonly string[];
  fee?: string;
  timeoutSeconds?: number;
};

export type BlendConfig = Readonly<Partial<Record<'mainnet' | 'testnet', BlendNetworkConfig>>>;

export type BlendSimulationResult = {
  status: 'success' | 'failed';
  latestLedger?: string;
  minResourceFee?: string;
  error?: string;
};

export type BlendTransactionProvider = {
  getAccountSequence(account: string, network: Network): Promise<string>;
  simulate(transactionXdr: string, network: Network): Promise<BlendSimulationResult>;
};

export type BlendPreparedTransaction = UnsignedProtocolTransaction & {
  status: 'simulated';
  transactionXdr: string;
  preview: {
    title: string;
    summary: string;
    warnings: readonly string[];
    simulation: BlendSimulationResult;
  };
};

const SOURCE = '@blend-capital/blend-sdk@3.3.0';

function sdkNetwork(network: Network, config: BlendNetworkConfig): BlendNetwork {
  return {
    rpc: config.rpc,
    passphrase: config.passphrase,
    opts: { allowHttp: config.rpc.startsWith('http://') },
  };
}

function asset(network: Network, address: string): AssetId {
  return { network, type: 'contract', contractAddress: address };
}

function fixed(value: bigint, decimals: number): string {
  const negative = value < 0n;
  const raw = (negative ? -value : value).toString().padStart(decimals + 1, '0');
  const split = decimals === 0 ? raw : `${raw.slice(0, -decimals)}.${raw.slice(-decimals)}`;
  return `${negative ? '-' : ''}${split.replace(/\.?0+$/, '') || '0'}`;
}

function fixedInput(value: string | undefined, decimals: number): bigint {
  if (!value || !/^\d+(?:\.\d+)?$/.test(value))
    throw new Error('Blend amount must be a non-negative decimal string');
  const [whole, fraction = ''] = value.split('.');
  if (fraction.length > decimals)
    throw new Error(`Blend amount exceeds ${decimals} decimal places`);
  return (
    BigInt(whole ?? '0') * 10n ** BigInt(decimals) + BigInt(fraction.padEnd(decimals, '0') || '0')
  );
}

function decimal(value: number | null | undefined): string | null {
  return value == null || !Number.isFinite(value) ? null : String(value);
}

function subtractOne(value: string): string {
  const [whole, fraction = ''] = value.split('.');
  const scale = 10n ** BigInt(fraction.length);
  const result = BigInt(whole ?? '0') * scale + BigInt(fraction || '0') - scale;
  return fixed(result, fraction.length);
}

export class BlendSdkAdapter extends BaseProtocolAdapter {
  readonly id = 'blend' as const;
  readonly name = 'Blend';
  readonly capabilities: ProtocolCapabilities = BaseProtocolAdapter.capabilities(
    'supply',
    'withdraw',
    'borrow',
    'repay',
    'claim',
  );

  constructor(
    private readonly config: BlendConfig,
    private readonly transactions: BlendTransactionProvider,
  ) {
    super();
  }

  override async discoverMarkets(network: Network): Promise<readonly ProtocolMarket[]> {
    const config = this.networkConfig(network);
    return Promise.all(
      config.poolIds.map(async (poolId) =>
        this.market(network, sdkNetwork(network, config), poolId),
      ),
    );
  }

  override async getMarket(network: Network, marketId: string): Promise<ProtocolMarket | null> {
    const config = this.networkConfig(network);
    if (!config.poolIds.includes(marketId)) return null;
    return this.market(network, sdkNetwork(network, config), marketId);
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
      reserves: market.reserves ?? [],
    };
  }

  override async getUserPositions(
    network: Network,
    account: string,
  ): Promise<readonly ProtocolPosition[]> {
    const config = this.networkConfig(network);
    const sdk = sdkNetwork(network, config);
    const positions: ProtocolPosition[] = [];
    for (const poolId of config.poolIds) {
      const pool = await PoolV2.load(sdk, poolId);
      const user = await pool.loadUser(account);
      const estimate = PositionsEstimate.build(pool, await pool.loadOracle(), user.positions);
      for (const reserve of pool.reserves.values()) {
        const collateral = user.getCollateral(reserve);
        const supply = user.getSupply(reserve);
        const liabilities = user.getLiabilities(reserve);
        const healthRatio =
          estimate.totalEffectiveLiabilities > 0
            ? decimal(estimate.totalEffectiveCollateral / estimate.totalEffectiveLiabilities)
            : null;
        if (collateral > 0n)
          positions.push(
            this.position(
              network,
              account,
              poolId,
              reserve,
              'supply',
              collateral,
              healthRatio,
              user,
            ),
          );
        if (supply > 0n)
          positions.push(
            this.position(network, account, poolId, reserve, 'supply', supply, healthRatio, user),
          );
        if (liabilities > 0n)
          positions.push(
            this.position(
              network,
              account,
              poolId,
              reserve,
              'borrow',
              liabilities,
              healthRatio,
              user,
            ),
          );
      }
    }
    return positions;
  }

  override async getYieldMetrics(network: Network) {
    const markets = await this.discoverMarkets(network);
    return markets.flatMap((market) =>
      (market.reserves ?? []).flatMap((reserve) =>
        reserve.supplyApy
          ? [
              {
                protocol: 'blend' as const,
                market: market.id,
                apy: reserve.supplyApy,
                tvl: null,
                risk: 'medium' as const,
                asOf: new Date(),
                source: SOURCE,
              },
            ]
          : [],
      ),
    );
  }

  override async getRiskMetrics(
    network: Network,
    account?: string,
  ): Promise<readonly ProtocolRiskMetrics[]> {
    if (!account) return [];
    const positions = await this.getUserPositions(network, account);
    return positions.flatMap((position) => {
      if (position.healthRatio == null) return [];
      const ratio = Number(position.healthRatio);
      const severity =
        ratio < 1.2 ? ('high' as const) : ratio < 1.5 ? ('medium' as const) : ('low' as const);
      return [
        {
          protocol: 'blend' as const,
          marketId: position.marketId,
          name: 'Health ratio',
          value: position.healthRatio,
          unit: 'ratio',
          severity,
          source: SOURCE,
          asOf: position.asOf,
        },
        {
          protocol: 'blend' as const,
          marketId: position.marketId,
          name: 'Liquidation buffer',
          value: subtractOne(position.healthRatio),
          unit: 'ratio above 1.0',
          severity,
          source: SOURCE,
          asOf: position.asOf,
        },
      ];
    });
  }

  override buildSupplyTransaction(request: ProtocolTransactionRequest) {
    return this.buildBlend('supply', request);
  }
  override buildWithdrawTransaction(request: ProtocolTransactionRequest) {
    return this.buildBlend('withdraw', request);
  }
  override buildBorrowTransaction(request: ProtocolTransactionRequest) {
    return this.buildBlend('borrow', request);
  }
  override buildRepayTransaction(request: ProtocolTransactionRequest) {
    return this.buildBlend('repay', request);
  }
  override buildClaimTransaction(request: ProtocolTransactionRequest) {
    return this.buildBlend('claim', request);
  }

  private networkConfig(network: Network): BlendNetworkConfig {
    if (network !== 'mainnet' && network !== 'testnet')
      throw new Error(`Blend does not support ${network}`);
    const config = this.config[network];
    if (!config || config.poolIds.length === 0)
      throw new Error(`No verified Blend pool IDs configured for ${network}`);
    return config;
  }

  private async market(
    network: Network,
    sdk: BlendNetwork,
    poolId: string,
  ): Promise<ProtocolMarket> {
    const pool = await PoolV2.load(sdk, poolId);
    const reserves = [...pool.reserves.values()].map((reserve) =>
      this.reserveMetrics(network, reserve),
    );
    return {
      id: poolId,
      protocol: 'blend',
      network,
      name: pool.metadata.name,
      assets: reserves.map((reserve) => reserve.asset),
      category: 'lending',
      enabled: pool.metadata.status === 0,
      source: SOURCE,
      asOf: new Date(),
      reserves,
    };
  }

  private reserveMetrics(network: Network, reserve: Reserve): ProtocolReserveMetrics {
    const supplyIncentive = reserve.supplyEmissions
      ? [
          {
            kind: 'supply' as const,
            token: null,
            rate: decimal(
              reserve.supplyEmissions.emissionsPerYearPerToken(
                reserve.totalSupply(),
                reserve.config.decimals,
              ),
            ),
            source: SOURCE,
          },
        ]
      : [];
    const borrowIncentive = reserve.borrowEmissions
      ? [
          {
            kind: 'borrow' as const,
            token: null,
            rate: decimal(
              reserve.borrowEmissions.emissionsPerYearPerToken(
                reserve.totalLiabilities(),
                reserve.config.decimals,
              ),
            ),
            source: SOURCE,
          },
        ]
      : [];
    return {
      asset: asset(network, reserve.assetId),
      decimals: reserve.config.decimals,
      totalSupply: fixed(reserve.totalSupply(), reserve.config.decimals),
      totalBorrow: fixed(reserve.totalLiabilities(), reserve.config.decimals),
      supplyApr: decimal(reserve.supplyApr),
      supplyApy: decimal(reserve.estSupplyApy),
      borrowApr: decimal(reserve.borrowApr),
      borrowApy: decimal(reserve.estBorrowApy),
      utilization: decimal(reserve.getUtilizationFloat()),
      incentives: [...supplyIncentive, ...borrowIncentive],
    };
  }

  private position(
    network: Network,
    account: string,
    poolId: string,
    reserve: Reserve,
    kind: 'supply' | 'borrow',
    amount: bigint,
    healthRatio: string | null,
    user: Awaited<ReturnType<Pool['loadUser']>>,
  ): ProtocolPosition {
    const rewards: ProtocolReward[] = [...user.emissions.values()]
      .filter((emission) => emission.accrued > 0n)
      .map((emission) => ({ token: null, amount: emission.accrued.toString(), source: SOURCE }));
    return {
      id: `${poolId}:${reserve.assetId}:${kind}`,
      protocol: 'blend',
      marketId: poolId,
      account,
      kind,
      assets: [
        { asset: asset(network, reserve.assetId), amount: fixed(amount, reserve.config.decimals) },
      ],
      value: null,
      healthRatio,
      source: SOURCE,
      asOf: new Date(),
      rewards,
    };
  }

  private async buildBlend(
    operation: 'supply' | 'withdraw' | 'borrow' | 'repay' | 'claim',
    request: ProtocolTransactionRequest,
  ): Promise<BlendPreparedTransaction> {
    const config = this.networkConfig(request.network);
    const poolId = request.marketId ?? config.poolIds[0];
    if (!poolId) throw new Error('Blend pool ID is required');
    const account = request.account;
    const base: UnsignedProtocolTransaction = {
      protocol: 'blend',
      operation,
      network: request.network,
      sourceAccount: account,
      marketId: poolId,
      asset: request.asset ?? null,
      amount: request.amount ?? null,
      quoteAsset: null,
      minReceived: null,
      slippageBps: null,
      destination: null,
      positionId: request.positionId ?? null,
      decimals: request.decimals ?? null,
      reserveTokenIds: request.reserveTokenIds ?? [],
      requiredSigners: [account],
      status: 'unsigned',
    };
    const operationXdr =
      operation === 'claim'
        ? new PoolContractV2(poolId).claim({
            from: account,
            reserve_token_ids: [...(request.reserveTokenIds ?? [])],
            to: account,
          })
        : new PoolContractV2(poolId).submit({
            from: account,
            spender: account,
            to: account,
            requests: [
              {
                request_type: {
                  supply: RequestType.SupplyCollateral,
                  withdraw: RequestType.WithdrawCollateral,
                  borrow: RequestType.Borrow,
                  repay: RequestType.Repay,
                }[operation],
                address:
                  request.asset?.contractAddress ??
                  (() => {
                    throw new Error('Blend asset contract address is required');
                  })(),
                amount: fixedInput(request.amount, request.decimals ?? 7),
              },
            ],
          });
    const sequence = await this.transactions.getAccountSequence(account, request.network);
    const tx = new TransactionBuilder(new Account(account, sequence), {
      fee: config.fee ?? '100',
      networkPassphrase:
        config.passphrase || (request.network === 'mainnet' ? Networks.PUBLIC : Networks.TESTNET),
    })
      .addOperation(xdr.Operation.fromXDR(operationXdr, 'base64'))
      .setTimeout(config.timeoutSeconds ?? 300)
      .build();
    const transactionXdr = tx.toXDR();
    const simulation = await this.transactions.simulate(transactionXdr, request.network);
    if (simulation.status !== 'success')
      throw new Error(
        `Blend transaction simulation failed: ${simulation.error ?? 'unknown error'}`,
      );
    return {
      ...base,
      status: 'simulated',
      transactionXdr,
      preview: {
        title: `Blend ${operation}`,
        summary: `${operation} on Blend pool ${poolId}`,
        warnings: ['Review the simulated transaction before approving it in your wallet.'],
        simulation,
      },
    };
  }
}
