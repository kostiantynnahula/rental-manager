// The only scopes an API key may carry: the single source for the CLI and `@Scopes()`.
export const API_KEY_SCOPES = [
  'photos:read',
  'readings:create-draft',
  'meters:read',
  'photos:parse-result',
  'photos:assign',
  'apartments:read',
  'readings:read',
  'readings:confirm',
  'readings:cancel',
  'photos:upload',
  'statements:read',
  'statements:preview',
  'tariffs:read',
  'condition-photos:read',
  'condition-photos:describe',
] as const;

export type ApiKeyScope = (typeof API_KEY_SCOPES)[number];
