import type { Prisma } from '../../generated/prisma/client.js';

export const photoWithReadingsInclude = {
  readings: {
    select: { id: true, meterId: true, kind: true, status: true, period: true },
    orderBy: { createdAt: 'asc' },
  },
} satisfies Prisma.PhotoInclude;

export type PhotoWithReadings = Prisma.PhotoGetPayload<{
  include: typeof photoWithReadingsInclude;
}>;
