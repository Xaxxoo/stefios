import { Controller, Get, Param, Query } from '@nestjs/common';
import type { AssetsService } from './assets.service';

@Controller({ path: 'assets', version: '1' })
export class AssetsController {
  constructor(private readonly assets: AssetsService) {}
  @Get() list(
    @Query('network') network?: 'testnet' | 'mainnet',
    @Query('category') category?: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
  ) {
    return this.assets.list({
      network,
      category,
      limit: limit ? Number(limit) : undefined,
      cursor,
    });
  }
  @Get('search') search(@Query('q') q = '', @Query('network') network?: 'testnet' | 'mainnet') {
    return this.assets.search(q, network);
  }
  @Get(':assetId/metadata') metadata(@Param('assetId') assetId: string) {
    return this.assets.getMetadata(decodeURIComponent(assetId));
  }
  @Get(':assetId') get(@Param('assetId') assetId: string) {
    return this.assets.get(decodeURIComponent(assetId));
  }
}
