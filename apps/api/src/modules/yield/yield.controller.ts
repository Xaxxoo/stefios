import { Controller, Get, Param, Query } from '@nestjs/common';
import type { ProtocolsService } from '../protocols/protocols.service';

@Controller({ path: 'defi', version: '1' })
export class YieldController {
  constructor(private readonly protocols: ProtocolsService) {}

  @Get(':address') defiForAddress(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.defi(network, address);
  }
}

@Controller({ path: 'yield', version: '1' })
export class YieldOpportunitiesController {
  constructor(private readonly protocols: ProtocolsService) {}

  @Get()
  opportunities(
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
    @Query('protocol') protocol?: string,
    @Query('asset') asset?: string,
    @Query('rwaOrDefi') rwaOrDefi?: string,
    @Query('risk') risk?: string,
    @Query('liquidity') liquidity?: string,
    @Query('yield') yieldFilter?: string,
  ) {
    return this.protocols.yieldOpportunities(network, {
      protocol,
      asset,
      rwaOrDefi,
      risk,
      liquidity,
      yield: yieldFilter,
    });
  }
}
