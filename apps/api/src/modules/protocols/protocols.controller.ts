import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { ProtocolTransactionRequest, QuoteRequest } from '@sfo/protocol-adapters';
import type { ProtocolsService } from './protocols.service';

class PrepareBlendTransactionDto {
  @IsString() account!: string;
  @IsIn(['mainnet', 'testnet']) network!: 'mainnet' | 'testnet';
  @IsOptional() @IsString() marketId?: string;
  @IsOptional() @IsString() amount?: string;
  @IsOptional() @IsString() decimals?: string;
  @IsOptional() @IsString() reserveTokenIds?: string;
  @IsOptional() asset?: ProtocolTransactionRequest['asset'];
  @IsOptional() quoteAsset?: ProtocolTransactionRequest['quoteAsset'];
  @IsOptional() tokenAssets?: ProtocolTransactionRequest['tokenAssets'];
  @IsOptional() @IsString() poolIndex?: string;
  @IsOptional() amounts?: readonly string[];
  @IsOptional() @IsString() minShares?: string;
  @IsOptional() minAmounts?: readonly string[];
  @IsOptional() @IsString() minReceived?: string;
  @IsOptional() @IsString() slippageBps?: string;
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

  @Get('aquarius/markets') aquariusMarkets(
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.aquariusMarkets(network);
  }
  @Get('aquarius/positions/:address') aquariusPositions(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.aquariusPositions(network, address);
  }
  @Get('aquarius/yield') aquariusYield(
    @Query('network') network: 'mainnet' | 'testnet' = 'testnet',
  ) {
    return this.protocols.aquariusYield(network);
  }
  @Post('aquarius/quotes') aquariusQuote(@Body() body: QuoteRequest) {
    return this.protocols.aquariusQuote(body);
  }
  @Post('aquarius/transactions/:operation/prepare') prepareAquarius(
    @Param('operation') operation: string,
    @Body() body: PrepareBlendTransactionDto,
  ) {
    return this.protocols.aquariusPrepare(operation, {
      ...body,
      decimals: body.decimals ? Number(body.decimals) : undefined,
      reserveTokenIds: body.reserveTokenIds ? JSON.parse(body.reserveTokenIds) : undefined,
    } as ProtocolTransactionRequest);
  }
  @Get('sushi/status') sushiStatus(@Query('network') network: 'mainnet' | 'testnet' = 'mainnet') {
    return this.protocols.sushiStatus(network);
  }
  @Get('sushi/markets') sushiMarkets(@Query('network') network: 'mainnet' | 'testnet' = 'mainnet') {
    return this.protocols.sushiMarkets(network);
  }
  @Get('sushi/positions/:address') sushiPositions(
    @Param('address') address: string,
    @Query('network') network: 'mainnet' | 'testnet' = 'mainnet',
  ) {
    return this.protocols.sushiPositions(network, address);
  }
  @Get('sushi/yield') sushiYield(@Query('network') network: 'mainnet' | 'testnet' = 'mainnet') {
    return this.protocols.sushiYield(network);
  }
  @Post('sushi/transactions/:operation/prepare') prepareSushi(
    @Param('operation') operation: string,
    @Body() body: PrepareBlendTransactionDto,
  ) {
    return this.protocols.sushiPrepare(operation, {
      ...body,
      decimals: body.decimals ? Number(body.decimals) : undefined,
    } as ProtocolTransactionRequest);
  }
}
