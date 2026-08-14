import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ActivityService } from './activity.service';

@Controller({ path: 'activity', version: '1' })
export class ActivityController {
  constructor(private readonly activity: ActivityService) {}
  @Get(':address') list(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
    @Query('limit') limit?: string,
  ) {
    return this.activity.list(address, network, limit ? Number(limit) : 50);
  }
}
