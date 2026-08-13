import { Controller, Get, HttpCode, HttpStatus, Res } from '@nestjs/common';
import type { Response } from 'express';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly health: HealthService) {}

  @Get()
  healthcheck() {
    return { status: 'ok', service: 'stellar-financial-os-api' };
  }

  @Get('readiness')
  @HttpCode(HttpStatus.OK)
  async readiness(@Res() response: Response) {
    const result = await this.health.readiness();
    return response
      .status(result.status === 'ok' ? HttpStatus.OK : HttpStatus.SERVICE_UNAVAILABLE)
      .json(result);
  }
}
