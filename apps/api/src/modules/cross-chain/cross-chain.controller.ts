import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import type { CrossChainTransferRequest } from './cross-chain-provider';
import type { CrossChainService } from './cross-chain.service';

class CreateTransferDto implements CrossChainTransferRequest {
  @IsString() @MinLength(1) provider!: string;
  @IsString() @MinLength(1) sourceChain!: string;
  @IsString() @MinLength(1) destinationChain!: string;
  @IsString() @MinLength(1) sourceAsset!: string;
  @IsString() @MinLength(1) destinationAsset!: string;
  @IsString() @MinLength(1) amount!: string;
  @IsString() @MinLength(50) account!: string;
}

@Controller({ path: 'cross-chain', version: '1' })
export class CrossChainController {
  constructor(
    private readonly crossChain: CrossChainService,
    private readonly auth: AuthService,
  ) {}

  @Get('providers') providers() {
    return this.crossChain.providers();
  }

  @Get()
  async list(@Req() request: Request) {
    const session = await this.session(request);
    return this.crossChain.list(session.userId);
  }

  @Get(':id')
  async get(@Req() request: Request, @Param('id') id: string, @Query('refresh') refresh = 'true') {
    const session = await this.session(request);
    return this.crossChain.get(session.userId, id, refresh !== 'false');
  }

  @Post()
  async create(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Body() body: CreateTransferDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.crossChain.create(session.userId, body);
  }

  @Post(':id/refresh')
  async refresh(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('id') id: string,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.crossChain.refresh(session.userId, id);
  }

  private async session(request: Request) {
    const token = request.cookies?.[AUTH_SESSION_COOKIE];
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return session;
  }
  private async requireCsrf(request: Request, csrf: string | undefined) {
    if (!csrf || request.cookies?.[AUTH_CSRF_COOKIE] !== csrf)
      throw new UnauthorizedException('CSRF validation failed');
    return this.session(request);
  }
}
