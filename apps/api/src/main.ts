import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module.js';
import { Env, NodeEnv } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Same paths as the browser sees through the web app's /api/* proxy (auth cookie paths rely on it).
  // Swagger (/docs) is mounted separately and isn't affected.
  app.setGlobalPrefix('api');
  // Auth tokens travel in httpOnly cookies.
  app.use(cookieParser());
  // Behind the local Next.js proxy: take the client IP from X-Forwarded-For (used by the throttler).
  app.set('trust proxy', 'loopback');

  app.useGlobalPipes(
    new ValidationPipe({
      // Strip properties without validation decorators and reject requests that send them.
      whitelist: true,
      forbidNonWhitelisted: true,
      // Turn payloads into DTO class instances and convert primitive params ('5' → 5).
      transform: true,
    }),
  );
  app.enableShutdownHooks();

  const config = app.get<ConfigService<Env, true>>(ConfigService);

  // Swagger UI at /docs, OpenAPI JSON at /docs-json.
  if (config.get('NODE_ENV', { infer: true }) !== NodeEnv.Production) {
    const document = new DocumentBuilder()
      .setTitle('Rental Manager API')
      .setDescription('Meter readings, tariffs and monthly utility statements')
      .setVersion('0.1')
      // Cookie auth: log in via POST /api/auth/login and the browser sends the cookie afterwards.
      .addCookieAuth('access_token')
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, document));
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
