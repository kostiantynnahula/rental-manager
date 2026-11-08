import type { PrismaService } from '../prisma/prisma.service.js';
import { UserKind } from '../generated/prisma/enums.js';
import { ApiKeysService } from './api-keys.service.js';
import { generateApiKey, hashApiKey } from './helpers/api-key-token.js';
import { parseScopes } from './helpers/parse-scopes.js';

describe('ApiKeysService.verify', () => {
  const { key, prefix } = generateApiKey();

  function stored(overrides: { revokedAt?: Date; isActive?: boolean; kind?: UserKind } = {}) {
    return {
      id: 'key-1',
      userId: 'user-1',
      name: 'test',
      prefix,
      keyHash: hashApiKey(key),
      scopes: ['photos:read'],
      lastUsedAt: null,
      revokedAt: overrides.revokedAt ?? null,
      createdAt: new Date(),
      user: {
        id: 'user-1',
        email: 'worker@service.invalid',
        kind: overrides.kind ?? UserKind.SERVICE,
        passwordHash: null,
        name: 'worker',
        isActive: overrides.isActive ?? true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };
  }

  // vitest doesn't emit decorator metadata, so the service is built by hand with a stubbed Prisma.
  function serviceReturning(row: ReturnType<typeof stored> | null) {
    const findUnique = vi.fn().mockResolvedValue(row);
    const prisma = { apiKey: { findUnique } } as unknown as PrismaService;
    return { service: new ApiKeysService(prisma), findUnique };
  }

  it('returns the key and its user for a valid key, looked up by hash', async () => {
    const { service, findUnique } = serviceReturning(stored());
    const result = await service.verify(key);
    expect(result?.apiKey.prefix).toBe(prefix);
    expect(result?.user.email).toBe('worker@service.invalid');
    expect(findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { keyHash: hashApiKey(key) } }),
    );
  });

  it('rejects a token without the rm_ prefix without hitting the DB', async () => {
    const { service, findUnique } = serviceReturning(stored());
    expect(await service.verify('eyJhbGciOiJIUzI1NiJ9.x.y')).toBeNull();
    expect(findUnique).not.toHaveBeenCalled();
  });

  it('rejects an unknown key', async () => {
    expect(await serviceReturning(null).service.verify(key)).toBeNull();
  });

  it('rejects a revoked key', async () => {
    expect(
      await serviceReturning(stored({ revokedAt: new Date() })).service.verify(key),
    ).toBeNull();
  });

  it('rejects a key of an inactive user', async () => {
    expect(await serviceReturning(stored({ isActive: false })).service.verify(key)).toBeNull();
  });

  it('rejects a key bound to a HUMAN user', async () => {
    expect(await serviceReturning(stored({ kind: UserKind.HUMAN })).service.verify(key)).toBeNull();
  });
});

describe('parseScopes', () => {
  it('trims and dedupes', () => {
    expect(parseScopes(' photos:read,photos:read , readings:create-draft')).toEqual([
      'photos:read',
      'readings:create-draft',
    ]);
  });

  it('lists the allowed scopes for an unknown one', () => {
    expect(() => parseScopes('photos:read,nope')).toThrow(
      'Unknown scope "nope". Allowed: photos:read, readings:create-draft',
    );
  });

  it('requires at least one scope', () => {
    expect(() => parseScopes(' , ')).toThrow(/At least one scope/);
  });
});
