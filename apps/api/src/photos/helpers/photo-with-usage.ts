import type { Prisma } from '../../generated/prisma/client.js';
import { ReadingStatus } from '../../generated/prisma/enums.js';

// "Linked" = referenced by a reading that isn't CANCELLED.
export const activeReading = {
  status: { not: ReadingStatus.CANCELLED },
} satisfies Prisma.ReadingWhereInput;

// Counts only the readings that block DELETE.
export const photoWithUsageInclude = {
  _count: { select: { readings: { where: activeReading } } },
} satisfies Prisma.PhotoInclude;

export type PhotoWithUsage = Prisma.PhotoGetPayload<{ include: typeof photoWithUsageInclude }>;
