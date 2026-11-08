import type { Request } from 'express';

// Token from `Authorization: Bearer <token>`. Never log the header: it carries the API key.
export function getBearerToken(req: Request): string | undefined {
  const [scheme, token] = req.headers.authorization?.split(' ') ?? [];
  return scheme?.toLowerCase() === 'bearer' && token ? token : undefined;
}
