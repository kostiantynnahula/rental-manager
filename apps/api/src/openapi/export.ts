// Writes openapi.json (consumed by apps/web `gen:api`) without starting the server.
// Run via `pnpm --filter api openapi:export` (builds first: Nest DI needs decorator metadata, which tsx can't emit).
import { writeFile } from 'node:fs/promises';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { AppModule } from '../app.module.js';
import { buildSwaggerConfig } from './swagger-config.js';

const OUTPUT_FILE = 'openapi.json';

async function exportOpenApi(): Promise<void> {
  // create() builds the module graph but doesn't run onModuleInit (that happens in init/listen),
  // so Prisma never connects: no database needed, only a valid .env for config validation.
  const app = await NestFactory.create(AppModule, { logger: ['error', 'warn'] });
  // No setGlobalPrefix here (main.ts has 'api'): paths stay /auth/login, ... and the prefix goes into
  // `servers`, matching the web client's `baseUrl: '/api'`. Otherwise it would request /api/api/...
  const document = SwaggerModule.createDocument(app, {
    ...buildSwaggerConfig(),
    servers: [{ url: '/api' }],
  });
  await writeFile(OUTPUT_FILE, `${JSON.stringify(document, null, 2)}\n`);
  await app.close();
  console.log(`OpenAPI document written to ${OUTPUT_FILE}`);
}
await exportOpenApi();
