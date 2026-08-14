import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { WatchlistItem } from '../../database/entities';

export const WATCHLIST_TARGET_TYPES = ['asset', 'rwa', 'defi_market', 'yield_opportunity'] as const;
export type WatchlistTargetType = (typeof WATCHLIST_TARGET_TYPES)[number];

@Injectable()
export class WatchlistService {
  constructor(@InjectRepository(WatchlistItem) private readonly items: Repository<WatchlistItem>) {}

  list(userId: string) {
    return this.items.find({
      where: { userId },
      order: { createdAt: 'DESC' },
      relations: ['asset'],
    });
  }

  async add(userId: string, targetType: WatchlistTargetType, targetRef: string, assetId?: string) {
    if (!WATCHLIST_TARGET_TYPES.includes(targetType))
      throw new BadRequestException('Unsupported watchlist target');
    const normalized = targetRef.trim().slice(0, 255);
    if (!normalized) throw new BadRequestException('A watchlist target is required');
    const existing = await this.items.findOne({
      where: { userId, targetType, targetRef: normalized },
    });
    if (existing) return existing;
    return this.items.save(
      this.items.create({ userId, targetType, targetRef: normalized, assetId: assetId ?? null }),
    );
  }

  async remove(userId: string, id: string) {
    const item = await this.items.findOne({ where: { id, userId } });
    if (!item) throw new NotFoundException('Watchlist item not found');
    await this.items.remove(item);
    return { ok: true };
  }
}
