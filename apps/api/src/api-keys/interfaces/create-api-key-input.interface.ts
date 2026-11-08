import type { ApiKeyScope } from '../constants/api-key-scopes.js';

export interface CreateApiKeyInput {
  // Service name, e.g. "worker" → user `worker@service.invalid`.
  service: string;
  // Human label of the key, e.g. "dev laptop".
  name: string;
  scopes: ApiKeyScope[];
}
