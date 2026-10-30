import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for everything LeaseResponseDto needs; PRIMARY first (enum order), then by name.
export const leaseWithTenantsInclude = {
  tenants: {
    include: { tenant: true },
    orderBy: [{ role: 'asc' }, { tenant: { fullName: 'asc' } }],
  },
} satisfies Prisma.LeaseInclude;

export type LeaseWithTenants = Prisma.LeaseGetPayload<{ include: typeof leaseWithTenantsInclude }>;
