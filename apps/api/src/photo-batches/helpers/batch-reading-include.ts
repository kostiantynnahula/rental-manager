import { Prisma } from '../../generated/prisma/client.js';

// A reading of the batch summary: values in zone order, the meter and its apartment.
export const batchReadingInclude = {
  values: { orderBy: { zone: 'asc' } },
  meter: { include: { apartment: true } },
} satisfies Prisma.ReadingInclude;

export type BatchReading = Prisma.ReadingGetPayload<{ include: typeof batchReadingInclude }>;
