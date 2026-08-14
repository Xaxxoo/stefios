import 'reflect-metadata';
import { ValidationPipe, VersioningType } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/http-exception.filter';
import { StructuredLogger } from './common/logger';
import cookieParser from 'cookie-parser';
import express from 'express';
import type { RequestHandler } from 'express';

const securityHeaders: RequestHandler = (_request, response, next) => {
  response.setHeader('X-Content-Type-Options', 'nosniff');
  response.setHeader('X-Frame-Options', 'DENY');
  response.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  if (process.env.NODE_ENV === 'production')
    response.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  next();
};

export async function createApp() {
  const app = await NestFactory.create(AppModule, { logger: new StructuredLogger() });
  app.enableShutdownHooks();
  app.setGlobalPrefix('api');
  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });
  const webOrigin = process.env.WEB_ORIGIN;
  if (!webOrigin && process.env.NODE_ENV !== 'test') throw new Error('WEB_ORIGIN is required');
  app.enableCors({
    origin: webOrigin,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  app.use(securityHeaders);
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ limit: '32kb', extended: false }));
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }),
  );
  app.useGlobalFilters(new HttpExceptionFilter());
  const swaggerConfig = new DocumentBuilder()
    .setTitle('Stellar Financial OS API')
    .setVersion('1.0')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  return app;
}

async function bootstrap() {
  const app = await createApp();
  await app.listen(Number(process.env.API_PORT ?? 4000));
}

if (require.main === module) void bootstrap();
