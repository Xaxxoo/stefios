import { Controller, Get, Param, Query } from '@nestjs/common';
import type { PortfolioService } from './portfolio.service';

@Controller({ path: 'portfolio', version: '1' })
export class PortfolioController {
  constructor(private readonly portfolio: PortfolioService) {}
  @Get(':address/allocation') allocation(
    @Param('address') address: string,
    @Query('network') network?: 'testnet' | 'mainnet',
  ) {
    return this.portfolio.allocation(address, network ?? 'testnet');
  }
  @Get(':address/history') history(
    @Param('address') address: string,
    @Query('network') network?: 'testnet' | 'mainnet',
    @Query('limit') limit?: string,
  ) {
    return this.portfolio.history(address, network ?? 'testnet', limit ? Number(limit) : undefined);
  }
  @Get(':address') get(
    @Param('address') address: string,
    @Query('network') network?: 'testnet' | 'mainnet',
  ) {
    return this.portfolio.get(address, network ?? 'testnet');
  }
}
