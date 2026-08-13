import { Controller, Get, Param, Query } from '@nestjs/common';
import type { RwaService } from './rwa.service';

@Controller({ path: 'rwa', version: '1' })
export class RwaController {
  constructor(private readonly rwa: RwaService) {}
  @Get() list(@Query('network') network?: 'testnet' | 'mainnet', @Query('limit') limit?: string) {
    return this.rwa.list(network, limit ? Number(limit) : undefined);
  }
  @Get(':assetId') get(@Param('assetId') assetId: string) {
    return this.rwa.get(decodeURIComponent(assetId));
  }
}
