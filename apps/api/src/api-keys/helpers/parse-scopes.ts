import { API_KEY_SCOPES, type ApiKeyScope } from '../constants/api-key-scopes.js';

function isApiKeyScope(value: string): value is ApiKeyScope {
  return (API_KEY_SCOPES as readonly string[]).includes(value);
}

// "a, b,a" → ['a', 'b']. At least one scope: routes deny keys by default, so a scopeless key would be useless.
export function parseScopes(input: string): ApiKeyScope[] {
  const allowed = `Allowed: ${API_KEY_SCOPES.join(', ')}`;
  const values = [
    ...new Set(
      input
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
  ];
  if (values.length === 0) throw new Error(`At least one scope is required. ${allowed}`);
  const unknown = values.find((v) => !isApiKeyScope(v));
  if (unknown !== undefined) throw new Error(`Unknown scope "${unknown}". ${allowed}`);
  return values as ApiKeyScope[];
}
