import { createHash, randomBytes } from 'node:crypto';
import { API_KEY_PREFIX } from '../constants/api-key-format.js';

// Key = `rm_<8 hex>_<32 random bytes, base64url>`. The prefix (`rm_<8 hex>`) is public: it's stored as is and
// shown in lists/logs. Hex has no `_`, so the prefix always ends at the second underscore.
export function generateApiKey(): { key: string; prefix: string } {
  const prefix = `${API_KEY_PREFIX}${randomBytes(4).toString('hex')}`;
  return { key: `${prefix}_${randomBytes(32).toString('base64url')}`, prefix };
}

// Only this SHA-256 of the whole key is stored. A fast hash is enough (unlike passwords): 32 random bytes can't
// be brute-forced, and a deterministic hash lets the unique keyHash column be the lookup key.
export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}
