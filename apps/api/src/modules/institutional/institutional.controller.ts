import { Controller, Get, Req, UnauthorizedException } from '@nestjs/common';
import type { Request } from 'express';
import { AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import type { InstitutionalService } from './institutional.service';

@Controller({ path: 'institutional', version: '1' })
export class InstitutionalController {
  constructor(
    private readonly institutional: InstitutionalService,
    private readonly auth: AuthService,
  ) {}
  @Get()
  async overview(@Req() request: Request) {
    const token = request.cookies?.[AUTH_SESSION_COOKIE];
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return this.institutional.overview(session.userId);
  }
}
