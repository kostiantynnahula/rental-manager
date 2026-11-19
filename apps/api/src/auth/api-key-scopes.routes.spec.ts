import { ForbiddenException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { JwtService } from '@nestjs/jwt';
import type { ApiKeysService } from '../api-keys/api-keys.service.js';
import { API_KEY_SCOPES, type ApiKeyScope } from '../api-keys/constants/api-key-scopes.js';
import { ApartmentsController } from '../apartments/apartments.controller.js';
import { ConditionPhotosController } from '../condition-photos/condition-photos.controller.js';
import { ApartmentConditionPhotosController } from '../condition-photos/apartment-condition-photos.controller.js';
import type { ApartmentsService } from '../apartments/apartments.service.js';
import type { Apartment } from '../generated/prisma/client.js';
import type { LeaseWithTenants } from '../leases/helpers/lease-with-tenants.js';
import { LeasesController } from '../leases/leases.controller.js';
import { MetersController } from '../meters/meters.controller.js';
import { ApartmentReadingsController } from '../readings/apartment-readings.controller.js';
import { MeterReadingsController } from '../readings/meter-readings.controller.js';
import { ApartmentStatementsController } from '../statements/apartment-statements.controller.js';
import type { StatementWithDetails } from '../statements/helpers/statement-with-details.js';
import { StatementsController } from '../statements/statements.controller.js';
import type { StatementsService } from '../statements/statements.service.js';
import { ApartmentTariffsController } from '../tariffs/apartment-tariffs.controller.js';
import { TariffsController } from '../tariffs/tariffs.controller.js';
import { TenantsController } from '../tenants/tenants.controller.js';
import type { AuthUser } from './interfaces/auth-user.interface.js';
import type { AuthenticatedRequest } from './interfaces/authenticated-request.interface.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

type Route = [name: string, controller: abstract new (...args: never[]) => object, method: string];

// The MCP server's read routes (#117): the real controllers' @Scopes metadata, read by the real guard.
const OPEN: [scope: ApiKeyScope, ...Route][] = [
  ['apartments:read', 'GET /apartments/:id', ApartmentsController, 'get'],
  ['meters:read', 'GET /meters/:id', MetersController, 'get'],
  ['readings:read', 'GET /apartments/:apartmentId/readings', ApartmentReadingsController, 'list'],
  [
    'readings:read',
    'GET /apartments/:apartmentId/readings/history',
    ApartmentReadingsController,
    'history',
  ],
  ['readings:read', 'GET /meters/:meterId/readings', MeterReadingsController, 'list'],
  [
    'statements:read',
    'GET /apartments/:apartmentId/statements',
    ApartmentStatementsController,
    'list',
  ],
  ['statements:read', 'GET /statements/:id', StatementsController, 'findOne'],
  ['tariffs:read', 'GET /tariffs', TariffsController, 'list'],
  ['tariffs:read', 'GET /tariffs/:id', TariffsController, 'get'],
  ['tariffs:read', 'GET /apartments/:apartmentId/tariffs', ApartmentTariffsController, 'list'],
  [
    'statements:preview',
    'POST /apartments/:apartmentId/statements/preview',
    ApartmentStatementsController,
    'preview',
  ],
  // The worker's condition photo routes (#129).
  ['condition-photos:read', 'GET /condition-photos/:id/file', ConditionPhotosController, 'file'],
  [
    'condition-photos:describe',
    'PUT /condition-photos/:id/description',
    ConditionPhotosController,
    'setDescription',
  ],
];

// Human-only: closed to keys whatever scopes they hold.
const CLOSED: Route[] = [
  ['POST /apartments/:apartmentId/statements', ApartmentStatementsController, 'issue'],
  ['GET /tenants', TenantsController, 'list'],
  ['GET /leases/:id', LeasesController, 'get'],
  // Embeds the lease with tenants.
  ['GET /condition-photos/:id', ConditionPhotosController, 'findOne'],
  ['GET /apartments/:id/condition-photos', ApartmentConditionPhotosController, 'list'],
];

function run(
  [, controller, method]: Route,
  auth: { keyScopes: readonly string[] } | { cookie: true },
) {
  const verify = vi
    .fn()
    .mockResolvedValue(
      'keyScopes' in auth
        ? { apiKey: { id: 'key-1', scopes: [...auth.keyScopes] }, user: { id: 'service-1' } }
        : null,
    );
  const apiKeys = { verify, touch: vi.fn() } as unknown as ApiKeysService;
  const jwt = {
    verifyAsync: vi.fn().mockResolvedValue({ sub: 'human-1' }),
  } as unknown as JwtService;
  const req = ('keyScopes' in auth
    ? { headers: { authorization: 'Bearer rm_ab12cd34_secret' }, cookies: {} }
    : { headers: {}, cookies: { access_token: 'jwt' } }) as unknown as AuthenticatedRequest;
  const handler = (controller.prototype as Record<string, unknown>)[method];
  if (typeof handler !== 'function') throw new Error(`${controller.name}.${method} not found`);
  const context = {
    getHandler: () => handler,
    getClass: () => controller,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
  return new JwtAuthGuard(new Reflector(), jwt, apiKeys).canActivate(context);
}

describe('API key scopes of the MCP read routes', () => {
  describe.each(OPEN)('%s → %s', (scope, ...route) => {
    it('lets a key with the scope in', async () => {
      expect(await run(route, { keyScopes: [scope] })).toBe(true);
    });

    it('rejects a key without it with 403', async () => {
      const others = API_KEY_SCOPES.filter((s) => s !== scope);
      await expect(run(route, { keyScopes: others })).rejects.toThrow(ForbiddenException);
    });

    it('still lets a human (cookie) in', async () => {
      expect(await run(route, { cookie: true })).toBe(true);
    });
  });

  it.each(CLOSED)('%s stays closed to a key with every scope', async (...route) => {
    await expect(run(route, { keyScopes: API_KEY_SCOPES })).rejects.toThrow(ForbiddenException);
  });
});

describe('tenant data for API keys', () => {
  const lease = {
    id: 'lease-1',
    apartmentId: 'apt-1',
    startDate: new Date('2026-01-01'),
    endDate: null,
    monthlyRent: 1500000,
    notes: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    tenants: [
      {
        tenantId: 't-1',
        role: 'PRIMARY',
        tenant: { fullName: 'Ivan Petrenko', phone: '+380501112233' },
      },
    ],
  } as unknown as LeaseWithTenants;
  const apartment = { id: 'apt-1' } as unknown as Apartment;
  const statement = {
    id: 'st-1',
    apartmentId: 'apt-1',
    period: new Date('2026-10-01'),
    warnings: [],
    lines: [],
    lease: { id: 'lease-1', tenants: [{ tenant: { fullName: 'Ivan Petrenko' } }] },
  } as unknown as StatementWithDetails;

  // Through the real controllers, so a route that forgets tenantDataOptions(user) fails here.
  const apartments = new ApartmentsController({
    findWithCurrentLease: vi.fn().mockResolvedValue({ apartment, currentLease: lease }),
    list: vi.fn().mockResolvedValue([{ ...apartment, leases: [lease] }]),
  } as unknown as ApartmentsService);
  const statements = new StatementsController({
    findOrThrow: vi.fn().mockResolvedValue(statement),
  } as unknown as StatementsService);

  const key: AuthUser = { id: 'service-1', apiKeyId: 'key-1' };
  const human: AuthUser = { id: 'human-1' };
  const tenant = {
    tenantId: 't-1',
    fullName: 'Ivan Petrenko',
    phone: '+380501112233',
    role: 'PRIMARY',
  };

  it.each([
    ['a key gets none', key, [], null],
    ['a human gets them as before', human, [tenant], 'Ivan Petrenko'],
  ])('%s', async (_name, user, tenants, primaryTenantName) => {
    expect((await apartments.get('apt-1', user)).currentLease?.tenants).toEqual(tenants);
    expect((await apartments.list({ active: 'true' }, user))[0].currentLease?.tenants).toEqual(
      tenants,
    );
    expect((await statements.findOne('st-1', user)).lease?.primaryTenantName).toBe(
      primaryTenantName,
    );
  });
});
