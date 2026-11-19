import { Prisma } from '../../generated/prisma/client.js';

// Leases covering `day` — usually today; condition photos pass their takenOn (endDate is inclusive, null =
// open-ended). At most one per apartment: leases_no_overlap.
export function currentLeaseWhere(day: Date): Prisma.LeaseWhereInput {
  return {
    startDate: { lte: day },
    OR: [{ endDate: null }, { endDate: { gte: day } }],
  };
}
