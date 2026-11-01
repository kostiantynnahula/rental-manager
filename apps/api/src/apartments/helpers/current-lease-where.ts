import { Prisma } from '../../generated/prisma/client.js';

// Leases covering `today` (endDate is inclusive, null = open-ended). At most one per apartment: leases_no_overlap.
export function currentLeaseWhere(today: Date): Prisma.LeaseWhereInput {
  return {
    startDate: { lte: today },
    OR: [{ endDate: null }, { endDate: { gte: today } }],
  };
}
