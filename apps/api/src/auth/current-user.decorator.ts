import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<AuthenticatedRequest>().user,
);
