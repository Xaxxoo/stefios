import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { CrossChainTransfer } from '../../database/entities';
import type {
  CrossChainProviderRegistry,
  CrossChainTransferRequest,
  NormalizedCrossChainTransfer,
} from './cross-chain-provider';

@Injectable()
export class CrossChainService {
  constructor(
    @InjectRepository(CrossChainTransfer)
    private readonly transfers: Repository<CrossChainTransfer>,
    @Inject('CROSS_CHAIN_PROVIDER_REGISTRY') private readonly registry: CrossChainProviderRegistry,
  ) {}

  providers() {
    return this.registry.list();
  }

  async list(userId: string) {
    const rows = await this.transfers.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
    return rows.map((row) => this.toResponse(row));
  }

  async get(userId: string, id: string, refresh = true) {
    const row = await this.transfers.findOne({ where: { id, userId } });
    if (!row) throw new NotFoundException('Cross-chain transfer not found');
    if (refresh && !['completed', 'failed'].includes(row.state)) await this.refreshRow(row);
    return this.toResponse(row);
  }

  async create(userId: string, request: CrossChainTransferRequest) {
    if (request.sourceChain === request.destinationChain)
      throw new BadRequestException('Cross-chain transfer requires different networks');
    const provider = this.registry.get(request.provider);
    if (!provider.createTransfer)
      throw new BadRequestException(
        `Provider ${request.provider} does not expose transfer creation`,
      );
    const transfer = await provider.createTransfer(request);
    const row = this.transfers.create(this.toEntity(userId, transfer));
    const saved = await this.transfers.save(row);
    return this.toResponse(saved);
  }

  async refresh(userId: string, id: string) {
    return this.get(userId, id, true);
  }

  private async refreshRow(row: CrossChainTransfer) {
    const provider = this.registry.get(row.provider);
    const externalId = this.externalId(row);
    const latest = await provider.getTransfer(externalId);
    // A provider status is not sufficient for settlement: verify source and destination
    // against the provider's authoritative chain/indexer state before persisting it.
    const verified = await provider.verifySettlement(latest);
    Object.assign(row, this.toEntity(row.userId, verified));
    await this.transfers.save(row);
  }

  private externalId(row: CrossChainTransfer) {
    const value = row.providerMetadata?.externalId;
    if (typeof value !== 'string' || !value)
      throw new BadRequestException('Transfer provider ID is missing');
    return value;
  }

  private toEntity(
    userId: string,
    transfer: NormalizedCrossChainTransfer,
  ): Partial<CrossChainTransfer> {
    return {
      userId,
      provider: transfer.provider,
      sourceNetwork: transfer.sourceChain,
      destinationNetwork: transfer.destinationChain,
      sourceAsset: transfer.sourceAsset,
      destinationAsset: transfer.destinationAsset,
      sourceTransactionHash: transfer.sourceTransaction,
      destinationTransactionHash: transfer.destinationTransaction,
      amount: transfer.amount,
      fees: transfer.fees,
      status: transfer.state,
      state: transfer.state,
      recoveryState: transfer.recoveryState,
      error: transfer.error,
      completedAt: transfer.completedAt ? new Date(transfer.completedAt) : null,
      providerMetadata: { externalId: transfer.externalId, raw: transfer.raw },
    };
  }

  private toResponse(row: CrossChainTransfer) {
    return {
      id: row.id,
      provider: row.provider,
      sourceChain: row.sourceNetwork,
      destinationChain: row.destinationNetwork,
      sourceAsset: row.sourceAsset,
      destinationAsset: row.destinationAsset,
      amount: row.amount,
      sourceTransaction: row.sourceTransactionHash,
      destinationTransaction: row.destinationTransactionHash,
      fees: row.fees,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      completedAt: row.completedAt,
      state: row.state,
      error: row.error,
      recoveryState: row.recoveryState,
    };
  }
}
