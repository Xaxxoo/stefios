import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ProtocolTransactionRequest } from '@sfo/protocol-adapters';
import type { ProtocolsService } from './protocols.service';

class PrepareBlendTransactionDto {
  @IsString() account!: string;
  @IsIn(['mainnet', 'testnet']) network!: 'mainnet' | 'testnet';
  @IsOptional() @IsString() marketId?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsString() decimals?: string;
  @IsOptional() @IsString() reserveTokenIds?: string;
  @IsOptional() asset?: ProtocolTransactionRequest['asset'];
}

@Controller({ path: 'protocols/blend', version: '1' })
export class ProtocolsController {
  constructor(private readonly protocols: ProtocolsService) {}
  @Get('markets') markets(@Query('network') network: 'mainnet' | 'testnet' = 'testnet') {
    return this.protocols.markets(network);
  }
  @Get('markets/:marketId') market(
    @Param('marketId') marketId: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.market(network, marketId);
  }
  @Get('markets/:marketId/metrics') metrics(
    @Param('marketId') marketId: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.metrics(network, marketId);
  }
  @Get('positions/:address') positions(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.positions(network, address);
  }
  @Get('yield') yield(@Query('network') network: 'mainnet' | 'testnet' = 'testnet') {
    return this.protocols.yield(network);
  }
  @Get('risk/:address') risk(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.risk(network, address);
  }
  @Post('transactions/:operation/prepare') prepare(
    @Param('operation') operation: string,
    @Body() body: PrepareBlendTransactionDto,
  ) {
    return this.protocols.prepare(operation, {
      ...body,
      decimals: body.decimals ? Number(body.decimals) : undefined,
      reserveTokenIds: body.reserveTokenIds ? JSON.parse(body.reserveTokenIds) : undefined,
    } as ProtocolTransactionRequest);
  }
}
