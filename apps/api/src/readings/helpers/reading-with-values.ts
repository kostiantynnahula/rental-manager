import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for ReadingResponseDto: values in zone order.
export const readingWithValuesInclude = {
  values: { orderBy: { zone: 'asc' } },
} satisfies Prisma.ReadingInclude;

export type ReadingWithValues = Prisma.ReadingGetPayload<{
  include: typeof readingWithValuesInclude;
}>;
