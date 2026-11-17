import createClient, { type Client } from 'openapi-fetch';
import type { Env } from '../config/env.js';
import type { paths } from './schema.js';

export type ApiClient = Client<paths>;

// Typed from the API's OpenAPI document (`pnpm gen:api`). The key goes in the Authorization header:
// never log the client's options or request headers.
export function createApiClient(env: Env): ApiClient {
  return createClient<paths>({
    baseUrl: env.API_BASE_URL,
    headers: { Authorization: `Bearer ${env.MCP_API_KEY}` },
  });
}
