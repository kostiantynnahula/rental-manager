import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for TenantListItemResponseDto: just enough of each lease to derive status and current apartment.
export const tenantListInclude = {
  leases: {
    select: {
      lease: {
        select: { startDate: true, endDate: true, apartment: { select: { id: true, name: true } } },
      },
    },
  },
} satisfies Prisma.TenantInclude;

export type TenantWithLeaseDates = Prisma.TenantGetPayload<{ include: typeof tenantListInclude }>;
