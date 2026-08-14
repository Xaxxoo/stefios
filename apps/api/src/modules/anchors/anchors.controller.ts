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
import { IsIn, IsOptional, IsString, Matches, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import type { AnchorFlowKind, AnchorNetwork, AnchorQuoteRequest } from './anchor-adapter';
import type { AnchorsService } from './anchors.service';

class DiscoverAnchorDto {
  @IsString() @MinLength(3) domain!: string;
  @IsIn(['mainnet', 'testnet']) network!: AnchorNetwork;
}

class AuthChallengeDto {
  @IsString() @Matches(/^[GMA-Z2-7]{50,70}$/) account!: string;
}

class AuthVerifyDto {
  @IsString() @MinLength(20) signedTransaction!: string;
}

class AnchorFlowDto {
  @IsIn(['deposit', 'withdraw']) kind!: 'deposit' | 'withdraw';
  @IsString() @MinLength(1) asset!: string;
  @IsOptional() @IsString() amount?: string;
  @IsString() @Matches(/^[GMA-Z2-7]{50,70}$/) account!: string;
  @IsOptional() @IsString() authToken?: string;
  @IsOptional() @IsString() quoteId?: string;
  @IsOptional() @IsString() lang?: string;
  @IsOptional() @IsString() countryCode?: string;
  @IsOptional() @IsString() deliveryMethod?: string;
}

@Controller({ path: 'anchors', version: '1' })
export class AnchorsController {
  constructor(
    private readonly anchors: AnchorsService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  list(@Query('network') network: AnchorNetwork = 'testnet') {
    return this.anchors.list(network);
  }

  @Post('discover')
  discover(@Body() body: DiscoverAnchorDto) {
    return this.anchors.discover(body.domain, body.network);
  }

  @Get('transactions')
  async transactions(@Req() request: Request, @Query('network') network?: AnchorNetwork) {
    const session = await this.session(request);
    return this.anchors.listForUser(session.userId, network);
  }

  @Get('transactions/:id')
  async transaction(
    @Req() request: Request,
    @Param('id') id: string,
    @Query('refresh') refresh = 'true',
  ) {
    const session = await this.session(request);
    return this.anchors.getForUser(session.userId, id, refresh !== 'false');
  }

  @Post('transactions/:id/refresh')
  async refresh(@Req() request: Request, @Param('id') id: string) {
    const session = await this.session(request);
    return this.anchors.getForUser(session.userId, id, true);
  }

  @Get(':slug/quotes')
  async quote(
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
    @Query() query: Record<string, string>,
  ) {
    const request: AnchorQuoteRequest = {
      kind: (query.kind ?? 'deposit') as AnchorFlowKind,
      sellAsset: query.sellAsset ?? query.sell_asset ?? '',
      buyAsset: query.buyAsset ?? query.buy_asset ?? '',
      sellAmount: query.sellAmount ?? query.sell_amount,
      buyAmount: query.buyAmount ?? query.buy_amount,
      countryCode: query.countryCode ?? query.country_code,
      deliveryMethod: query.deliveryMethod ?? query.delivery_method,
    };
    if (!request.sellAsset || !request.buyAsset)
      throw new UnauthorizedException('sellAsset and buyAsset are required');
    return this.anchors.quote(slug, network, request);
  }

  @Post(':slug/auth/challenge')
  async challenge(
    @Req() request: Request,
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
    @Body() body: AuthChallengeDto,
  ) {
    await this.session(request);
    return this.anchors.authenticationChallenge(slug, network, body.account);
  }

  @Post(':slug/auth/verify')
  async verify(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
    @Body() body: AuthVerifyDto,
  ) {
    await this.requireCsrfSession(request, csrfToken);
    return this.anchors.verifyAuthentication(slug, network, body.signedTransaction);
  }

  @Get(':slug/auth/status')
  async authStatus(
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
  ) {
    const info = await this.anchors.get(slug, network);
    return this.anchors.authStatus(info);
  }

  @Post(':slug/deposit') startDeposit(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
    @Body() body: AnchorFlowDto,
  ) {
    return this.start(request, csrfToken, slug, network, { ...body, kind: 'deposit' });
  }

  @Post(':slug/withdraw') startWithdraw(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
    @Body() body: AnchorFlowDto,
  ) {
    return this.start(request, csrfToken, slug, network, { ...body, kind: 'withdraw' });
  }

  @Get(':slug') get(
    @Param('slug') slug: string,
    @Query('network') network: AnchorNetwork = 'testnet',
  ) {
    return this.anchors.get(slug, network);
  }

  private async start(
    request: Request,
    csrfToken: string | undefined,
    slug: string,
    network: AnchorNetwork,
    body: AnchorFlowDto,
  ) {
    const session = await this.requireCsrfSession(request, csrfToken);
    return this.anchors.start(slug, network, session.userId, body);
  }

  private async session(request: Request) {
    const token = request.cookies?.[AUTH_SESSION_COOKIE];
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return session;
  }

  private async requireCsrfSession(request: Request, header: string | undefined) {
    const cookie = request.cookies?.[AUTH_CSRF_COOKIE];
    if (!cookie || !header || cookie !== header)
      throw new UnauthorizedException('CSRF validation failed');
    return this.session(request);
  }
}
