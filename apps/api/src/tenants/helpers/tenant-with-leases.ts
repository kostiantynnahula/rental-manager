import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for TenantDetailResponseDto: the tenant's leases with apartment names, newest first.
export const tenantWithLeasesInclude = {
  leases: {
    include: { lease: { include: { apartment: { select: { name: true } } } } },
    orderBy: { lease: { startDate: 'desc' } },
  },
} satisfies Prisma.TenantInclude;

export type TenantWithLeases = Prisma.TenantGetPayload<{ include: typeof tenantWithLeasesInclude }>;
