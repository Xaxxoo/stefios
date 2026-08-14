import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Patch,
  Post,
  Req,
  UnauthorizedException,
} from '@nestjs/common';
import { IsBoolean, IsIn, IsInt, IsObject, IsOptional, Max, Min } from 'class-validator';
import type { Request } from 'express';
import { AUTH_CSRF_COOKIE, AUTH_SESSION_COOKIE } from '../auth/auth.service';
import type { AuthService } from '../auth/auth.service';
import { ALERT_TYPES, type AlertsService } from './alerts.service';

class CreateAlertDto {
  @IsIn(ALERT_TYPES) type!: (typeof ALERT_TYPES)[number];
  @IsObject() conditions!: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(0) @Max(2_592_000) cooldownSeconds?: number;
}
class UpdateAlertDto {
  @IsOptional() @IsBoolean() enabled?: boolean;
  @IsOptional() @IsObject() conditions?: Record<string, unknown>;
  @IsOptional() @IsInt() @Min(0) @Max(2_592_000) cooldownSeconds?: number;
}
@Controller({ path: 'alerts', version: '1' })
export class AlertsController {
  constructor(
    private readonly alerts: AlertsService,
    private readonly auth: AuthService,
  ) {}
  @Get() async list(@Req() request: Request) {
    const session = await this.session(request);
    return this.alerts.list(session.userId);
  }
  @Post() async create(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Body() body: CreateAlertDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.alerts.create(session.userId, body.type, body.conditions, body.cooldownSeconds);
  }
  @Patch(':id') async update(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('id') id: string,
    @Body() body: UpdateAlertDto,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.alerts.update(session.userId, id, body);
  }
  @Delete(':id') async remove(
    @Req() request: Request,
    @Headers('x-csrf-token') csrf: string | undefined,
    @Param('id') id: string,
  ) {
    const session = await this.requireCsrf(request, csrf);
    return this.alerts.remove(session.userId, id);
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
