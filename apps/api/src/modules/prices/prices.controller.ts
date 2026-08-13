import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { IsArray, IsOptional, IsString, MaxLength, ArrayMaxSize } from 'class-validator';
import type { PricesService } from './prices.service';

class BatchPricesDto {
  @IsArray() @ArrayMaxSize(100) @IsString({ each: true }) assetIds!: string[];
  @IsOptional() @IsString() @MaxLength(16) quoteCurrency?: string;
}

@Controller({ path: 'prices', version: '1' })
export class PricesController {
  constructor(private readonly prices: PricesService) {}
  @Get(':assetId') get(
    @Param('assetId') assetId: string,
    @Query('quoteCurrency') quoteCurrency?: string,
  ) {
    return this.prices.get(decodeURIComponent(assetId), quoteCurrency);
  }
  @Post('batch') batch(@Body() body: BatchPricesDto) {
    return this.prices.batch(
      body.assetIds.map((assetId) => decodeURIComponent(assetId)),
      body.quoteCurrency,
    );
  }
}
