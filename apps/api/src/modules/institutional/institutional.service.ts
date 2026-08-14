import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import Decimal from 'decimal.js';
import type { Repository } from 'typeorm';
import { In } from 'typeorm';
import {
  StellarAccount as StellarAccountEntity,
  Transaction as TransactionEntity,
  WalletConnection as WalletConnectionEntity,
} from '../../database/entities';
import type { StellarAccount, Transaction, WalletConnection } from '../../database/entities';
import { PortfolioService } from '../portfolio/portfolio.service';
import { RiskService } from '../risk/risk.service';

@Injectable()
export class InstitutionalService {
  constructor(
    @InjectRepository(WalletConnectionEntity)
    private readonly connections: Repository<WalletConnection>,
    @InjectRepository(StellarAccountEntity) private readonly accounts: Repository<StellarAccount>,
    @InjectRepository(TransactionEntity) private readonly transactions: Repository<Transaction>,
    @Inject(PortfolioService) private readonly portfolio: PortfolioService,
    @Inject(RiskService) private readonly risk: RiskService,
  ) {}

  async overview(userId: string) {
    const connections = await this.connections.find({
      where: { userId },
      order: { createdAt: 'ASC' },
    });
    const accountData = await Promise.all(
      connections.map(async (connection) => {
        try {
          const [portfolio, risk] = await Promise.all([
            this.portfolio.get(
              connection.walletAddress,
              connection.network as 'testnet' | 'mainnet',
            ),
            this.risk.get(connection.walletAddress, connection.network as 'testnet' | 'mainnet'),
          ]);
          return {
            connection,
            portfolio,
            risk,
            status: 'available' as const,
          };
        } catch {
          return { connection, portfolio: null, risk: null, status: 'not_synchronized' as const };
        }
      }),
    );
    const sum = (field: string) =>
      accountData
        .reduce(
          (total, row) =>
            total.plus(
              row.portfolio
                ? String((row.portfolio as Record<string, unknown>)[field] ?? '0')
                : '0',
            ),
          new Decimal(0),
        )
        .toFixed();
    const byCategory = this.aggregateMaps(
      accountData.flatMap((row) => row.portfolio?.byCategory ?? []),
      'category',
    );
    const byProtocol = this.aggregateMaps(
      accountData.flatMap((row) => row.portfolio?.byProtocol ?? []),
      'protocol',
    );
    const issuerExposure = await this.issuerExposure(
      accountData.flatMap((row) => row.portfolio?.byAsset ?? []),
    );
    const groupMap = new Map<
      string,
      { name: string; accounts: string[]; netAssetValue: Decimal }
    >();
    for (const row of accountData) {
      const name = row.connection.accountGroup ?? 'Ungrouped';
      const group = groupMap.get(name) ?? { name, accounts: [], netAssetValue: new Decimal(0) };
      group.accounts.push(row.connection.walletAddress);
      if (row.portfolio)
        group.netAssetValue = group.netAssetValue.plus(row.portfolio.netPortfolioValue);
      groupMap.set(name, group);
    }
    const accountIds = (
      await this.accounts.find({
        where: {
          accountAddress: In(connections.map((item) => item.walletAddress)),
          network: In(connections.map((item) => item.network)),
        },
      })
    ).map((item) => item.id);
    const history = accountIds.length
      ? await this.transactions.find({
          where: { accountId: In(accountIds) },
          order: { ledgerTimestamp: 'DESC' },
          take: 100,
        })
      : [];
    return {
      asOf: new Date(),
      accountCount: connections.length,
      signableAccountCount: connections.filter((item) => !item.isViewOnly).length,
      viewOnlyAccountCount: connections.filter((item) => item.isViewOnly).length,
      nav: {
        grossAssetValue: sum('grossAssetValue'),
        liabilities: sum('liabilities'),
        netPortfolioValue: sum('netPortfolioValue'),
        availableLiquidity: sum('availableLiquidity'),
        yieldBearingAssets: sum('yieldBearingAssets'),
        estimatedPortfolioYield: this.weightedYield(accountData),
      },
      exposure: {
        rwa: sum('rwaExposure'),
        defi: sum('defiExposure'),
        byCategory,
        byProtocol,
        byIssuer: issuerExposure,
      },
      risk: {
        scores: accountData.flatMap((row) =>
          row.risk
            ? [
                {
                  address: row.connection.walletAddress,
                  score: (row.risk as { overallScore?: string }).overallScore ?? null,
                  severity: (row.risk as { severity?: string }).severity ?? null,
                },
              ]
            : [],
        ),
        methodology:
          'Per-account risk is calculated from concentration, liquidity, stale pricing, leverage, and data-quality inputs.',
      },
      groups: [...groupMap.values()].map((group) => ({
        name: group.name,
        accounts: group.accounts,
        netPortfolioValue: group.netAssetValue.toFixed(),
      })),
      accounts: accountData.map((row) => ({
        address: row.connection.walletAddress,
        network: row.connection.network,
        label: row.connection.label,
        accountGroup: row.connection.accountGroup,
        access: row.connection.isViewOnly ? 'VIEW_ONLY_ACCOUNT' : 'CONNECTED_SIGNABLE_ACCOUNT',
        lastSyncAt: row.connection.lastSyncAt,
        status: row.status,
        portfolio: row.portfolio
          ? {
              netPortfolioValue: row.portfolio.netPortfolioValue,
              availableLiquidity: row.portfolio.availableLiquidity,
              rwaExposure: row.portfolio.rwaExposure,
              defiExposure: row.portfolio.defiExposure,
              freshness: row.portfolio.freshness,
            }
          : null,
      })),
      transactionHistory: history.map((item) => ({
        hash: item.transactionHash,
        network: item.network,
        status: item.status,
        ledgerTimestamp: item.ledgerTimestamp,
        accountId: item.accountId,
      })),
    };
  }

  private aggregateMaps(rows: readonly Record<string, unknown>[], key: string) {
    const map = new Map<string, Decimal>();
    for (const row of rows) {
      const label = typeof row[key] === 'string' ? (row[key] as string) : 'unknown';
      map.set(label, (map.get(label) ?? new Decimal(0)).plus(String(row.value ?? '0')));
    }
    return [...map.entries()].map(([label, value]) => ({ [key]: label, value: value.toFixed() }));
  }
  private weightedYield(
    rows: readonly {
      portfolio: { yieldBearingAssets: string; estimatedPortfolioYield: string | null } | null;
    }[],
  ) {
    const denominator = rows.reduce(
      (total, row) => total.plus(row.portfolio?.yieldBearingAssets ?? '0'),
      new Decimal(0),
    );
    if (denominator.isZero()) return null;
    const numerator = rows.reduce(
      (total, row) =>
        total.plus(
          new Decimal(row.portfolio?.yieldBearingAssets ?? '0').times(
            row.portfolio?.estimatedPortfolioYield ?? '0',
          ),
        ),
      new Decimal(0),
    );
    return numerator.div(denominator).toFixed();
  }
  private async issuerExposure(rows: readonly Record<string, unknown>[]) {
    return rows
      .filter((row) => typeof row.asset === 'string' && row.asset.includes(':classic:'))
      .map((row) => ({
        issuer: (row.asset as string).split(':').at(-1) ?? 'unknown',
        value: String(row.value ?? '0'),
      }));
  }
}
