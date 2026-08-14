import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import type { WalletSyncService } from './wallet-sync.service';

class ViewOnlyWalletDto {
  @IsIn(['testnet', 'mainnet']) network!: 'testnet' | 'mainnet';
  @IsString() @MinLength(50) address!: string;
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() accountGroup?: string;
}
class WalletPatchDto {
  @IsOptional() @IsString() label?: string;
  @IsOptional() @IsString() accountGroup?: string;
}

@Controller({ path: 'wallets', version: '1' })
export class WalletsController {
  constructor(
    private readonly sync: WalletSyncService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async list(@Req() request: Request, @Query('network') network?: 'testnet' | 'mainnet') {
    const session = await this.session(request);
    return this.sync.listConnections(session.userId, network);
  }

  @Post('view-only') async addViewOnly(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Body() body: ViewOnlyWalletDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.sync.addViewOnly(
      session.userId,
      body.network,
      body.address,
      body.label,
      body.accountGroup,
    );
  }

  @Post(':address/sync')
  async syncWallet(
    @Req() request: Request,
    @Param('address') address: string,
    @Query('network') network: 'testnet' | 'mainnet' = 'testnet',
  ) {
    const session = await this.session(request);
    await this.sync.ensureUserConnection(session.userId, address, network);
    return this.sync.enqueue({ network, address });
  }

  @Get(':address/sync-status')
  async status(
    @Req() request: Request,
    @Param('address') address: string,
    @Query('network') network: 'testnet' | 'mainnet' = 'testnet',
  ) {
    const session = await this.session(request);
    await this.sync.ensureUserConnection(session.userId, address, network);
    return this.sync.status(address, network);
  }

  @Patch(':address') async patch(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('address') address: string,
    @Query('network') network: 'testnet' | 'mainnet' = 'testnet',
    @Body() body: WalletPatchDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.sync.updateConnection(session.userId, address, network, body);
  }
  @Delete(':address') async remove(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('address') address: string,
    @Query('network') network: 'testnet' | 'mainnet' = 'testnet',
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.sync.removeConnection(session.userId, address, network);
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
