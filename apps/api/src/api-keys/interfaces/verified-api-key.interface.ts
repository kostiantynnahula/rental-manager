import type { ApiKey, User } from '../../generated/prisma/client.js';

export interface VerifiedApiKey {
  apiKey: ApiKey;
  user: User;
}
