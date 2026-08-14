import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Patch,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { IsBoolean, IsOptional } from 'class-validator';
import type { Request, Response } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from './auth.service';
import type { AuthService } from './auth.service';
import type { CreateChallengeDto, VerifyChallengeDto } from './dto/auth.dto';

class SecurityPreferencesDto {
  @IsOptional() @IsBoolean() requireTransactionReview?: boolean;
  @IsOptional() @IsBoolean() showSimulationWarnings?: boolean;
}

@Controller({ path: 'auth', version: '1' })
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('challenge') challenge(@Body() body: CreateChallengeDto) {
    return this.auth.createChallenge(body);
  }

  @Post('verify') async verify(
    @Body() body: VerifyChallengeDto,
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.auth.verifyChallenge(body, {
      userAgent:
        typeof request.headers['user-agent'] === 'string'
          ? request.headers['user-agent']
          : undefined,
      ipAddress: request.ip,
    });
    this.setCookie(response, AUTH_SESSION_COOKIE, result.sessionToken, result.session.expiresAt);
    this.setCookie(response, AUTH_CSRF_COOKIE, result.csrfToken, result.session.expiresAt, false);
    return { session: result.session };
  }

  @Post('logout') async logout(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.requireCsrf(request, csrfToken);
    const sessionToken = this.sessionToken(request);
    const session = sessionToken ? await this.auth.getSessionByToken(sessionToken) : null;
    if (session) await this.auth.revokeSession(session.id);
    response.clearCookie(AUTH_SESSION_COOKIE);
    response.clearCookie(AUTH_CSRF_COOKIE);
    return { ok: true };
  }

  @Get('session') async session(@Req() request: Request) {
    const token = this.sessionToken(request);
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return session;
  }
  @Get('sessions') async sessions(@Req() request: Request) {
    const token = this.sessionToken(request);
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return this.auth.listSessions(session.userId);
  }
  @Get('security/preferences') async preferences(@Req() request: Request) {
    const session = await this.currentSession(request);
    return this.auth.securityPreferences(session.userId);
  }
  @Patch('security/preferences') async updatePreferences(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Body() body: SecurityPreferencesDto,
  ) {
    this.requireCsrf(request, csrfToken);
    const session = await this.currentSession(request);
    return this.auth.updateSecurityPreferences(session.userId, body);
  }
  @Delete('sessions/:id') async revoke(
    @Req() request: Request,
    @Headers('x-csrf-token') csrfToken: string | undefined,
    @Param('id') id: string,
  ) {
    this.requireCsrf(request, csrfToken);
    const token = this.sessionToken(request);
    const current = token ? await this.auth.getSessionByToken(token) : null;
    const target = await this.auth.getSession(id);
    if (!current || !target || current.userId !== target.userId)
      throw new UnauthorizedException('Session is invalid');
    await this.auth.revokeSession(id);
    return { ok: true };
  }

  private sessionToken(request: Request): string | null {
    return request.cookies?.[AUTH_SESSION_COOKIE] ?? null;
  }
  private requireCsrf(request: Request, header: string | undefined): void {
    const cookie = request.cookies?.[AUTH_CSRF_COOKIE];
    if (!cookie || !header || cookie !== header)
      throw new UnauthorizedException('CSRF validation failed');
  }
  private setCookie(
    response: Response,
    name: string,
    value: string,
    expires: Date,
    httpOnly = true,
  ): void {
    response.cookie(name, value, {
      httpOnly,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires,
      path: '/',
    });
  }
  private async currentSession(request: Request) {
    const token = this.sessionToken(request);
    const session = token ? await this.auth.getSessionByToken(token) : null;
    if (!session) throw new UnauthorizedException('Session is invalid or revoked');
    return session;
  }
}
