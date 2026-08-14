import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomUUID } from 'node:crypto';
import type { Repository } from 'typeorm';
import { Anchor, AnchorTransaction } from '../../database/entities';
import type {
  AnchorAdapter,
  AnchorAuthResult,
  AnchorFlowRequest,
  AnchorInfo,
  AnchorNetwork,
  AnchorQuoteRequest,
  AnchorTransaction as ExternalAnchorTransaction,
} from './anchor-adapter';

const STATE_TTL_MS = 30 * 60 * 1000;
const ANCHOR_INFO_SCHEMA = 'sep-1-normalized-v1';

export type AnchorSummary = Omit<AnchorInfo, 'assets'> & { assetCount: number };
export type AnchorTransactionSummary = ExternalAnchorTransaction & {
  localId: string;
  anchor: string;
  network: AnchorNetwork;
  state: 'active' | 'expired' | 'completed' | 'failed' | 'unknown';
  interactiveUrl: string | null;
};

@Injectable()
export class AnchorsService {
  constructor(
    @InjectRepository(Anchor) private readonly anchors: Repository<Anchor>,
    @InjectRepository(AnchorTransaction)
    private readonly transactions: Repository<AnchorTransaction>,
    @Inject('ANCHOR_ADAPTER') private readonly adapter: AnchorAdapter,
  ) {}

  async discover(domain: string, network: AnchorNetwork) {
    const info = await this.adapter.discover(domain, network);
    const entity = await this.upsertInfo(info);
    return this.summary(entity, info);
  }

  async list(network: AnchorNetwork): Promise<readonly AnchorSummary[]> {
    const rows = await this.anchors.find({ where: { network }, order: { name: 'ASC' } });
    return rows.map((row) => {
      const info = this.info(row);
      return this.summary(row, info);
    });
  }

  async get(slug: string, network: AnchorNetwork): Promise<AnchorInfo> {
    const row = await this.findAnchor(slug, network);
    return this.info(row);
  }

  async quote(
    slug: string,
    network: AnchorNetwork,
    request: AnchorQuoteRequest,
    authToken?: string,
  ) {
    return this.adapter.getQuote(await this.get(slug, network), request, authToken);
  }

  async authenticationChallenge(slug: string, network: AnchorNetwork, account: string) {
    return this.adapter.getAuthChallenge(await this.get(slug, network), account);
  }

  async verifyAuthentication(
    slug: string,
    network: AnchorNetwork,
    signedTransaction: string,
  ): Promise<AnchorAuthResult> {
    return this.adapter.verifyAuth(await this.get(slug, network), signedTransaction);
  }

  authStatus(info: AnchorInfo, token?: string) {
    return {
      required: info.authenticationRequired,
      authenticated: Boolean(token),
      method: info.webAuthEndpoint ? 'SEP-10' : null,
      contractAccountMethod: null,
      kycServer: info.kycServer,
      note: info.kycServer
        ? 'Identity and compliance information are collected by the anchor in its hosted flow.'
        : 'The anchor has not advertised a KYC server in its stellar.toml.',
    };
  }

  async start(
    slug: string,
    network: AnchorNetwork,
    userId: string,
    request: AnchorFlowRequest,
  ): Promise<AnchorTransactionSummary> {
    const info = await this.get(slug, network);
    if (info.authenticationRequired && !request.authToken)
      throw new UnauthorizedException('Authenticate with this anchor before starting a transfer');
    const result = await this.adapter.startFlow(info, request);
    const state = randomUUID();
    const metadata = {
      schema: 'anchor-transaction-v1',
      state,
      stateExpiresAt: new Date(Date.now() + STATE_TTL_MS).toISOString(),
      network,
      account: request.account,
      kind: request.kind,
      asset: request.asset,
      amount: request.amount ?? null,
      protocol: result.protocol,
      interactiveUrl: result.interactiveUrl,
      authToken: request.authToken ?? null,
      external: result.transaction,
    } satisfies Record<string, unknown>;
    const transaction = await this.transactions.save(
      this.transactions.create({
        anchorId: (await this.findAnchor(slug, network)).id,
        userId,
        externalId: result.transaction.id,
        type: request.kind,
        status: result.transaction.status,
        providerMetadata: metadata,
      }),
    );
    return this.transactionSummary(transaction, info, result.transaction, result.interactiveUrl);
  }

  async listForUser(userId: string, network?: AnchorNetwork) {
    const rows = await this.transactions.find({
      where: { userId, ...(network ? { anchor: { network } } : {}) },
      relations: ['anchor'],
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.map((row) => {
      const info = this.info(row.anchor);
      const external = this.external(row);
      return this.transactionSummary(row, info, external, this.interactiveUrl(row));
    });
  }

  async getForUser(userId: string, localId: string, refresh = true) {
    const row = await this.transactions.findOne({
      where: { id: localId, userId },
      relations: ['anchor'],
    });
    if (!row) throw new NotFoundException('Anchor transaction not found');
    const info = this.info(row.anchor);
    if (refresh && this.canRefresh(row)) {
      try {
        const external = await this.adapter.getTransaction(
          info,
          row.externalId,
          this.authToken(row),
        );
        row.status = external.status;
        row.providerMetadata = { ...(row.providerMetadata ?? {}), external };
        await this.transactions.save(row);
        return this.transactionSummary(row, info, external, this.interactiveUrl(row));
      } catch {
        // Provider availability must not erase the last known state.
      }
    }
    return this.transactionSummary(row, info, this.external(row), this.interactiveUrl(row));
  }

  private async findAnchor(slug: string, network: AnchorNetwork) {
    const row = await this.anchors.findOne({ where: { slug, network } });
    if (!row) throw new NotFoundException('Anchor has not been discovered for this network');
    return row;
  }

  private async upsertInfo(info: AnchorInfo) {
    let row = await this.anchors.findOne({ where: { slug: info.slug, network: info.network } });
    if (!row)
      row = this.anchors.create({
        slug: info.slug,
        network: info.network,
        name: info.name,
        domain: info.domain,
        providerMetadata: null,
      });
    row.name = info.name;
    row.domain = info.domain;
    row.providerMetadata = { schema: ANCHOR_INFO_SCHEMA, info };
    return this.anchors.save(row);
  }

  private info(row: Anchor): AnchorInfo {
    const value = row.providerMetadata?.info;
    if (!value || typeof value !== 'object')
      throw new BadRequestException('Anchor metadata is unavailable');
    return value as AnchorInfo;
  }

  private summary(row: Anchor, info: AnchorInfo): AnchorSummary {
    const { assets, ...rest } = info;
    return { ...rest, assetCount: assets.length };
  }

  private external(row: AnchorTransaction): ExternalAnchorTransaction {
    const value = row.providerMetadata?.external;
    if (!value || typeof value !== 'object')
      return {
        id: row.externalId,
        kind: row.type,
        status: row.status,
        statusEta: null,
        amountIn: null,
        amountOut: null,
        amountFee: null,
        assetIn: null,
        assetOut: null,
        stellarTransactionId: null,
        externalTransactionId: null,
        startedAt: row.createdAt.toISOString(),
        updatedAt: row.updatedAt.toISOString(),
        userActionRequired: row.status === 'pending_user',
        userActionUrl: null,
        rawStatus: row.status,
      };
    return value as ExternalAnchorTransaction;
  }

  private transactionSummary(
    row: AnchorTransaction,
    info: AnchorInfo,
    external: ExternalAnchorTransaction,
    interactiveUrl: string | null,
  ): AnchorTransactionSummary {
    return {
      ...external,
      localId: row.id,
      anchor: info.name,
      network: info.network,
      state: transactionState(external.rawStatus),
      interactiveUrl,
    };
  }

  private interactiveUrl(row: AnchorTransaction) {
    const value = row.providerMetadata?.interactiveUrl;
    return typeof value === 'string' ? value : null;
  }
  private authToken(row: AnchorTransaction) {
    const value = row.providerMetadata?.authToken;
    return typeof value === 'string' ? value : undefined;
  }
  private canRefresh(row: AnchorTransaction) {
    return !['completed', 'refunded', 'expired', 'error'].includes(row.status.toLowerCase());
  }
}

function transactionState(status: string): AnchorTransactionSummary['state'] {
  const normalized = status.toLowerCase();
  if (['completed'].includes(normalized)) return 'completed';
  if (normalized === 'expired') return 'expired';
  if (['refunded', 'error'].includes(normalized)) return 'failed';
  if (normalized.startsWith('pending') || normalized === 'incomplete') return 'active';
  return 'unknown';
}
