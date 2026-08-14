import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

@Injectable()
export class RequestIdMiddleware implements NestMiddleware {
  use(request: Request, response: Response, next: NextFunction): void {
    const supplied = request.header('x-request-id');
    const requestId = supplied && /^[A-Za-z0-9._-]{1,96}$/.test(supplied) ? supplied : randomUUID();
    response.setHeader('x-request-id', requestId);
    (request as Request & { requestId: string }).requestId = requestId;
    next();
  }
}
