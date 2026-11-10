import type { Prisma } from '../../generated/prisma/client.js';
import { ReadingStatus } from '../../generated/prisma/enums.js';

// "Linked" = referenced by a value of a reading that isn't CANCELLED.
export const activeReadingValue = {
  reading: { status: { not: ReadingStatus.CANCELLED } },
} satisfies Prisma.ReadingValueWhereInput;

// Counts only the values that block DELETE.
export const photoWithUsageInclude = {
  _count: { select: { readingValues: { where: activeReadingValue } } },
} satisfies Prisma.PhotoInclude;

export type PhotoWithUsage = Prisma.PhotoGetPayload<{ include: typeof photoWithUsageInclude }>;
