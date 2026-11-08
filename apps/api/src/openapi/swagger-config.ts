import { DocumentBuilder, type OpenAPIObject } from '@nestjs/swagger';

// Shared by main.ts (Swagger UI) and export.ts (openapi.json for the web client), so both describe the same API.
export function buildSwaggerConfig(): Omit<OpenAPIObject, 'paths'> {
  return (
    new DocumentBuilder()
      .setTitle('Rental Manager API')
      .setDescription('Meter readings, tariffs and monthly utility statements')
      .setVersion('0.1')
      // Cookie auth: log in via POST /api/auth/login and the browser sends the cookie afterwards.
      .addCookieAuth('access_token')
      // Service users (worker, bots): `Authorization: Bearer rm_…` API key, only on routes with @Scopes.
      .addBearerAuth({ type: 'http', scheme: 'bearer', description: 'API key (rm_…)' })
      .build()
  );
}
