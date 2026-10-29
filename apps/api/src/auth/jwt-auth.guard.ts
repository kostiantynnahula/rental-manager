import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { getAccessToken } from './helpers/auth-cookies.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';

// Registered globally (APP_GUARD): every route needs a valid access token unless @Public().
// Stateless on purpose: no DB lookup, so a deactivated user keeps access until the token expires.
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly jwt: JwtService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;

    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
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
}
