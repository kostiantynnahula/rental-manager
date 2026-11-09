import { ConfigService } from '@nestjs/config';
import createClient, { type Client } from 'openapi-fetch';
import { Env } from '../config/env.validation.js';
import type { paths } from './schema.js';

export const API_CLIENT = Symbol('API_CLIENT');

export type ApiClient = Client<paths>;

// Typed from the API's OpenAPI document (`pnpm gen:api`). The key goes in the Authorization header:
// never log the client's options or request headers.
export function apiClientFromConfig(config: ConfigService<Env, true>): ApiClient {
  return createClient<paths>({
    baseUrl: config.get('API_BASE_URL', { infer: true }),
    headers: { Authorization: `Bearer ${config.get('API_KEY', { infer: true })}` },
  });
}
