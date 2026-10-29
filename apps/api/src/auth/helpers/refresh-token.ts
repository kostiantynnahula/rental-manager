import { createHash, randomBytes } from 'node:crypto';

// Refresh tokens are opaque random strings (32 bytes, base64url).
export function generateRefreshToken(): string {
  return randomBytes(32).toString('base64url');
}

// Only this SHA-256 is stored. A fast hash is enough here (unlike passwords): 32 random bytes
// can't be brute-forced, and a deterministic hash lets the unique tokenHash column be the lookup key.
export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
