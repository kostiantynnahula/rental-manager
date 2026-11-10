import type { Prisma } from '../../generated/prisma/client.js';

// The photo's values with their readings; PhotoDetailResponseDto groups them per reading (photoReadings()).
export const photoWithReadingsInclude = {
  readingValues: {
    select: {
      zone: true,
      reading: { select: { id: true, meterId: true, kind: true, status: true, period: true } },
    },
    orderBy: [{ reading: { createdAt: 'asc' } }, { zone: 'asc' }],
  },
} satisfies Prisma.PhotoInclude;

export type PhotoWithReadings = Prisma.PhotoGetPayload<{
  include: typeof photoWithReadingsInclude;
}>;
