import type { Prisma } from '../../generated/prisma/client.js';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';

export const statementWithDetailsInclude = {
  lines: { orderBy: { position: 'asc' } },
  lease: {
    include: {
      tenants: {
        where: { role: LeaseTenantRole.PRIMARY },
        include: { tenant: { select: { fullName: true } } },
      },
    },
  },
} satisfies Prisma.StatementInclude;

export type StatementWithDetails = Prisma.StatementGetPayload<{
  include: typeof statementWithDetailsInclude;
}>;
