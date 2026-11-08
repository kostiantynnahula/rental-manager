import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ApiKeysService } from '../api-keys/api-keys.service.js';
import type { ApiKeyScope } from '../api-keys/constants/api-key-scopes.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';
import { IS_PUBLIC_KEY } from './public.decorator.js';
import { SCOPES_KEY } from './scopes.decorator.js';

const KEY = 'rm_ab12cd34_secret';

interface Setup {
  isPublic?: boolean;
  scopes?: ApiKeyScope[];
  keyScopes?: string[];
  keyValid?: boolean;
  headers?: Record<string, string>;
  cookies?: Record<string, string>;
}

// vitest doesn't emit decorator metadata, so the guard is built by hand with stubs.
function setup({
  isPublic = false,
  scopes,
  keyScopes = ['photos:read'],
  keyValid = true,
  headers = {},
  cookies = {},
}: Setup = {}) {
  const reflector = {
    getAllAndOverride: vi.fn((key: string) =>
      key === IS_PUBLIC_KEY ? isPublic : key === SCOPES_KEY ? scopes : undefined,
    ),
  } as unknown as Reflector;
  const verifyAsync = vi.fn().mockResolvedValue({ sub: 'human-1' });
  const jwt = { verifyAsync } as unknown as JwtService;
  const verify = vi
    .fn()
    .mockResolvedValue(
      keyValid ? { apiKey: { id: 'key-1', scopes: keyScopes }, user: { id: 'service-1' } } : null,
    );
  const touch = vi.fn().mockResolvedValue(undefined);
  const apiKeys = { verify, touch } as unknown as ApiKeysService;

  const req = { headers, cookies } as unknown as AuthenticatedRequest;
  const context = {
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;

  const guard = new JwtAuthGuard(reflector, jwt, apiKeys);
  return { run: () => guard.canActivate(context), req, verify, verifyAsync, touch };
}

const bearer = (token: string) => ({ authorization: `Bearer ${token}` });

describe('JwtAuthGuard', () => {
  it('lets public routes through without checking anything', async () => {
    const { run, verify, verifyAsync } = setup({ isPublic: true, headers: bearer(KEY) });
    expect(await run()).toBe(true);
    expect(verify).not.toHaveBeenCalled();
    expect(verifyAsync).not.toHaveBeenCalled();
  });

  it('authenticates a human by the access cookie and ignores @Scopes', async () => {
    const { run, req, verify } = setup({ cookies: { access_token: 'jwt' } });
    expect(await run()).toBe(true);
    expect(req.user).toEqual({ id: 'human-1' });
    expect(verify).not.toHaveBeenCalled();
  });

  it('accepts an API key that holds the route scope', async () => {
    const { run, req, touch } = setup({ scopes: ['photos:read'], headers: bearer(KEY) });
    expect(await run()).toBe(true);
    expect(req.user).toEqual({ id: 'service-1', apiKeyId: 'key-1' });
    expect(touch).toHaveBeenCalledWith('key-1');
  });

  it('denies an API key on a route without @Scopes (deny by default)', async () => {
    const { run, touch } = setup({ headers: bearer(KEY) });
    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
    expect(touch).not.toHaveBeenCalled();
  });

  it('denies an API key missing the route scope', async () => {
    const { run } = setup({ scopes: ['readings:create-draft'], headers: bearer(KEY) });
    await expect(run()).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects an unknown or revoked API key with 401', async () => {
    const { run } = setup({ scopes: ['photos:read'], keyValid: false, headers: bearer(KEY) });
    await expect(run()).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('ignores a non-key Bearer and falls back to the cookie', async () => {
    const { run, verify } = setup({ headers: bearer('eyJhbGciOiJIUzI1NiJ9.x.y') });
    await expect(run()).rejects.toBeInstanceOf(UnauthorizedException);
    expect(verify).not.toHaveBeenCalled();
  });
});
