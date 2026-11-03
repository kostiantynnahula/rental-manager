import { Prisma } from '../../generated/prisma/client.js';
import type { ReadingHistoryFilter } from '../interfaces/reading-history-filter.interface.js';

// SQL for the apartment reading history. Every user value goes in as a bound parameter (Prisma.sql),
// optional filters are fragments or Prisma.empty — never string concatenation.

// Confirmed readings of the apartment's meters (r = readings, m = meters).
export function readingHistoryWhere(filter: ReadingHistoryFilter): Prisma.Sql {
  return Prisma.sql`
    WHERE m."apartmentId" = ${filter.apartmentId}::uuid
      AND r."status" = 'CONFIRMED'
      ${filter.from ? Prisma.sql`AND r."period" >= ${filter.from}::date` : Prisma.empty}
      ${filter.to ? Prisma.sql`AND r."period" <= ${filter.to}::date` : Prisma.empty}
      ${filter.meterIds ? Prisma.sql`AND r."meterId" = ANY(${filter.meterIds}::uuid[])` : Prisma.empty}`;
}

// Stable total order for pagination: utility_type sorts by enum declaration order
// (ELECTRICITY, COLD_WATER, HOT_WATER, GAS); r.id breaks every remaining tie.
export const READING_HISTORY_ORDER = Prisma.sql`
  ORDER BY r."period" DESC, m."utility", m."label" NULLS FIRST, r."readingDate" DESC, r."id"`;
