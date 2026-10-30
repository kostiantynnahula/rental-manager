import { Prisma } from '../../generated/prisma/client.js';
import { ReadingStatus } from '../../generated/prisma/enums.js';

// Prisma include for a meter's latest CONFIRMED reading with its values (readings are never
// confirmed out of order, so the latest readingDate is the latest state of the meter).
export const lastConfirmedReadingInclude = {
  readings: {
    where: { status: ReadingStatus.CONFIRMED },
    orderBy: [{ readingDate: 'desc' }, { createdAt: 'desc' }],
    take: 1,
    include: { values: { orderBy: { zone: 'asc' } } },
  },
} satisfies Prisma.MeterInclude;

export type MeterWithLastReading = Prisma.MeterGetPayload<{
  include: typeof lastConfirmedReadingInclude;
}>;
