import { Controller, Get, Param, Query } from '@nestjs/common';
import type { RiskService } from './risk.service';

@Controller({ path: 'risk', version: '1' })
export class RiskController {
  constructor(private readonly risk: RiskService) {}

  @Get(':address')
  get(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.risk.get(address, network);
  }
}
