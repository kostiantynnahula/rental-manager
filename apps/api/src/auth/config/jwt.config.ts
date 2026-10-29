import { ConfigService } from '@nestjs/config';
import { JwtModuleOptions } from '@nestjs/jwt';
import { Env } from '../../config/env.validation.js';

// Access tokens only; refresh tokens are opaque and don't use JwtService.
export function jwtModuleOptionsFromConfig(config: ConfigService<Env, true>): JwtModuleOptions {
  return {
    secret: config.get('JWT_ACCESS_SECRET', { infer: true }),
    signOptions: { expiresIn: config.get('JWT_ACCESS_TTL_SECONDS', { infer: true }) },
  };
}
