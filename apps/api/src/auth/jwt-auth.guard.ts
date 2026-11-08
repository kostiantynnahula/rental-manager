import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { ApiKeysService } from '../api-keys/api-keys.service.js';
import { API_KEY_PREFIX } from '../api-keys/constants/api-key-format.js';
import type { ApiKeyScope } from '../api-keys/constants/api-key-scopes.js';
import { getAccessToken } from './helpers/auth-cookies.js';
import { getBearerToken } from './helpers/bearer-token.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SCOPES_KEY } from './scopes.decorator.js';

// Registered globally (APP_GUARD): every route needs auth unless @Public(). Two ways in:
// - `Authorization: Bearer rm_…` → API key of a service user (DB lookup), only for routes whose @Scopes it holds;
// - otherwise the `access_token` cookie JWT — stateless on purpose: no DB lookup, so a deactivated user keeps
//   access until the token expires. Humans ignore @Scopes.
// A Bearer that isn't an API key is ignored (humans authenticate with the cookie only).
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
    private readonly apiKeys: ApiKeysService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const targets = [context.getHandler(), context.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = getBearerToken(req);
    if (bearer?.startsWith(API_KEY_PREFIX)) {
      return this.authenticateApiKey(
        req,
        bearer,
        this.reflector.getAllAndOverride(SCOPES_KEY, targets),
      );
    }

    const token = getAccessToken(req);
    if (!token) throw new UnauthorizedException();
    try {
      const { sub } = await this.jwt.verifyAsync<{ sub: string }>(token);
      req.user = { id: sub };
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }

  // 401 = the key itself is bad (unknown, revoked, inactive user); 403 = a valid key not allowed here.
  private async authenticateApiKey(
    req: AuthenticatedRequest,
    token: string,
    required: ApiKeyScope[] | undefined,
  ): Promise<boolean> {
    const verified = await this.apiKeys.verify(token);
    if (!verified) throw new UnauthorizedException();
    const { apiKey, user } = verified;
    if (!required?.length || !required.every((scope) => apiKey.scopes.includes(scope))) {
      throw new ForbiddenException('API key lacks the required scope');
    }
    req.user = { id: user.id, apiKeyId: apiKey.id };
    await this.apiKeys.touch(apiKey.id);
    return true;
  }
}
