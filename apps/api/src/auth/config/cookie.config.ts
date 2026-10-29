import { ConfigService } from '@nestjs/config';
import { Env, NodeEnv } from '../../config/env.validation.js';
import type { AuthCookieOptions } from '../interfaces/auth-cookie-options.interface.js';

// Secure only in production; TTLs from the validated config.
export function authCookieOptionsFromConfig(config: ConfigService<Env, true>): AuthCookieOptions {
  return {
    secure: config.get('NODE_ENV', { infer: true }) === NodeEnv.Production,
    accessTtlSeconds: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }),
    refreshTtlDays: config.get('REFRESH_TOKEN_TTL_DAYS', { infer: true }),
  };
}
