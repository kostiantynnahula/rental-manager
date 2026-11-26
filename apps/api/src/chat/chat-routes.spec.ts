import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ApiKeysService } from '../api-keys/api-keys.service.js';
import { API_KEY_SCOPES } from '../api-keys/constants/api-key-scopes.js';
import type { AuthenticatedRequest } from '../auth/interfaces/authenticated-request.interface.js';
import { JwtAuthGuard } from '../auth/jwt-auth.guard.js';
import { ApartmentChatsController } from './apartment-chats.controller.js';
import { ChatsController } from './chats.controller.js';

type Route = [name: string, controller: abstract new (...args: never[]) => object, method: string];

const ROUTES: Route[] = [
  ['POST /apartments/:id/chats', ApartmentChatsController, 'create'],
  ['GET /apartments/:id/chats', ApartmentChatsController, 'list'],
  ['GET /chats/:id', ChatsController, 'findOne'],
  ['PATCH /chats/:id', ChatsController, 'update'],
  ['DELETE /chats/:id', ChatsController, 'remove'],
];

function run([, controller, method]: Route, asKey: boolean) {
  const apiKeys = {
    verify: vi
      .fn()
      .mockResolvedValue(
        asKey ? { apiKey: { id: 'k1', scopes: [...API_KEY_SCOPES] }, user: { id: 's1' } } : null,
      ),
    touch: vi.fn(),
  } as unknown as ApiKeysService;
  const jwt = { verifyAsync: vi.fn().mockResolvedValue({ sub: 'h1' }) } as unknown as JwtService;
  const req = (asKey
    ? { headers: { authorization: 'Bearer rm_ab12cd34_secret' }, cookies: {} }
    : { headers: {}, cookies: { access_token: 'jwt' } }) as unknown as AuthenticatedRequest;
  const handler = (controller.prototype as Record<string, unknown>)[method];
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return new JwtAuthGuard(new Reflector(), jwt, apiKeys).canActivate(context);
}

describe('chat routes are human-only', () => {
  it.each(ROUTES)('%s: 403 for a key with every scope', async (...route) => {
    await expect(run(route, true)).rejects.toThrow(ForbiddenException);
  });

  it.each(ROUTES)('%s: open to a human', async (...route) => {
    expect(await run(route, false)).toBe(true);
  });
});
