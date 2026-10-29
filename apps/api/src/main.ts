import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import { Env, NodeEnv } from './config/env.validation.js';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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
      .build();
    SwaggerModule.setup('docs', app, () => SwaggerModule.createDocument(app, document));
  }

  await app.listen(config.get('PORT', { infer: true }));
}
await bootstrap();
