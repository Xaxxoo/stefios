import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsIn, IsOptional, IsString, MinLength } from 'class-validator';
import type { Request } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import { WATCHLIST_TARGET_TYPES, type WatchlistService } from './watchlist.service';

class WatchlistDto {
  @IsIn(WATCHLIST_TARGET_TYPES) targetType!: (typeof WATCHLIST_TARGET_TYPES)[number];
  @IsString() @MinLength(1) targetRef!: string;
  @IsOptional() @IsString() assetId?: string;
}

@Controller({ path: 'watchlist', version: '1' })
export class WatchlistController {
  constructor(
    private readonly watchlist: WatchlistService,
    private readonly auth: AuthService,
  ) {}

  @Get()
  async list(@Req() request: Request) {
    const session = await this.session(request);
    return this.watchlist.list(session.userId);
  }

  @Post()
  async add(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Body() body: WatchlistDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.watchlist.add(session.userId, body.targetType, body.targetRef, body.assetId);
  }

  @Delete(':id')
  async remove(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('id') id: string,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.watchlist.remove(session.userId, id);
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
