import type { NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

type Bucket = { count: number; resetAt: number };

/** A small process-local guard; production deployments must also enforce an edge/shared limit. */
export class RateLimitMiddleware implements NestMiddleware {
  private readonly buckets = new Map<string, Bucket>();
  private readonly windowMs = 60_000;
  private readonly maximum = 300;

  use(request: Request, response: Response, next: NextFunction): void {
    const now = Date.now();
    const key = request.ip || request.socket.remoteAddress || 'unknown';
    const current = this.buckets.get(key);
    if (this.buckets.size > 10_000) {
      for (const [candidate, bucket] of this.buckets)
        if (bucket.resetAt <= now) this.buckets.delete(candidate);
    }
    const bucket =
      !current || current.resetAt <= now
        ? { count: 1, resetAt: now + this.windowMs }
        : { count: current.count + 1, resetAt: current.resetAt };
    this.buckets.set(key, bucket);
    response.setHeader('X-RateLimit-Limit', this.maximum);
    response.setHeader('X-RateLimit-Remaining', Math.max(0, this.maximum - bucket.count));
    if (bucket.count > this.maximum) {
      response.setHeader('Retry-After', Math.ceil((bucket.resetAt - now) / 1000));
      response.status(429).json({ statusCode: 429, error: 'Too many requests' });
      return;
    }
    next();
  }
}
