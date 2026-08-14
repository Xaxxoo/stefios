import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { IsIn, IsOptional, IsString } from 'class-validator';
import type { TransactionAction } from '@sfo/shared';
import type { ProtocolTransactionRequest, QuoteRequest } from '@sfo/protocol-adapters';
import type { TransactionsService } from './transactions.service';

class ComposeTransactionDto implements Partial<ProtocolTransactionRequest> {
  @IsString() account!: string;
  @IsString() protocol!: string;
  @IsIn(['mainnet', 'testnet']) network!: 'mainnet' | 'testnet';
  @IsIn([
    'supply',
    'withdraw',
    'borrow',
    'repay',
    'depositLiquidity',
    'withdrawLiquidity',
    'claim',
    'swap',
  ])
  action!: TransactionAction;
  @IsOptional() marketId?: string;
  @IsOptional() amount?: string;
  @IsOptional() decimals?: number;
  @IsOptional() asset?: ProtocolTransactionRequest['asset'];
  @IsOptional() quoteAsset?: ProtocolTransactionRequest['quoteAsset'];
  @IsOptional() minReceived?: string;
  @IsOptional() slippageBps?: string;
  @IsOptional() positionId?: string;
  @IsOptional() reserveTokenIds?: readonly number[];
  @IsOptional() poolIndex?: string;
  @IsOptional() amounts?: readonly string[];
  @IsOptional() minShares?: string;
  @IsOptional() minAmounts?: readonly string[];
  @IsOptional() quoteExpiresAt?: string;
}
class SubmitTransactionDto {
  @IsIn(['mainnet', 'testnet']) network!: 'mainnet' | 'testnet';
  @IsString() signedTransactionXdr!: string;
}
class QuoteDto implements QuoteRequest {
  @IsIn(['mainnet', 'testnet']) network!: 'mainnet' | 'testnet';
  tokenIn!: QuoteRequest['tokenIn'];
  tokenOut!: QuoteRequest['tokenOut'];
  @IsString() amountIn!: string;
  @IsString() slippageBps!: string;
  @IsOptional() decimals?: number;
  @IsOptional() strictReceive?: boolean;
}

@Controller({ path: 'transactions', version: '1' })
export class TransactionsController {
  constructor(private readonly transactions: TransactionsService) {}
  @Post('compose') compose(@Body() body: ComposeTransactionDto) {
    return this.transactions.compose(body as ComposerRequest);
  }
  @Post('submit') submit(@Body() body: SubmitTransactionDto) {
    return this.transactions.submit(body.network, body.signedTransactionXdr);
  }
  @Get(':hash') monitor(@Param('hash') hash: string) {
    return this.transactions.monitor(hash);
  }
}

type ComposerRequest = ComposeTransactionDto & { action: TransactionAction };

@Controller({ path: 'swap', version: '1' })
export class SwapController {
  constructor(private readonly transactions: TransactionsService) {}

  @Post('quotes') quotes(@Body() body: QuoteDto) {
    return this.transactions.quotes(body);
  }
}
