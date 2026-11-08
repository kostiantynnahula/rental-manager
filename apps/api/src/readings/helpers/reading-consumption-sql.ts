import { Prisma } from '../../generated/prisma/client.js';

// SQL for per-reading consumption. All of it reads the reading_consumption view (the single place consumption
// is computed); the view is filtered from outside by "meterId" (pushed down, so LAG sees the full history).

// Same-day order of kinds. Must match the window ORDER BY of the view (migration add_reading_consumption_view).
function kindRank(alias: string): Prisma.Sql {
  const kind = Prisma.raw(`${alias}."kind"`);
  return Prisma.sql`CASE ${kind} WHEN 'INITIAL' THEN 0 WHEN 'REGULAR' THEN 1 ELSE 2 END`;
}

// CONFIRMED readings: their rows of the view as is.
export function confirmedConsumptionQuery(meterIds: string[], readingIds: string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT "readingId", "zone", "value", "consumption"
    FROM "reading_consumption"
    -- "meterId" is pushed down into the view (PARTITION BY column); readingId alone isn't.
    WHERE "meterId" = ANY(${meterIds}::uuid[])
      AND "readingId" = ANY(${readingIds}::uuid[])
    ORDER BY "zone"`;
}

// DRAFT / CANCELLED readings aren't in the view: value − the latest view row of the same meter and zone that
// comes before the reading in the view's order (period, readingDate, kind, createdAt). NULL without one.
export function unconfirmedConsumptionQuery(meterIds: string[], readingIds: string[]): Prisma.Sql {
  return Prisma.sql`
    SELECT r."id" AS "readingId", v."zone", v."value", v."value" - prev."value" AS "consumption"
    FROM "readings" r
    JOIN "reading_values" v ON v."readingId" = r."id"
    LEFT JOIN LATERAL (
      SELECT c."value"
      FROM "reading_consumption" c
      JOIN "readings" cr ON cr."id" = c."readingId"
      WHERE c."meterId" = ANY(${meterIds}::uuid[])
        AND c."meterId" = r."meterId"
        AND c."zone" = v."zone"
        AND (c."period", c."readingDate", ${kindRank('c')}, cr."createdAt")
          < (r."period", r."readingDate", ${kindRank('r')}, r."createdAt")
      ORDER BY c."period" DESC, c."readingDate" DESC, ${kindRank('c')} DESC, cr."createdAt" DESC
      LIMIT 1
    ) prev ON TRUE
    WHERE r."id" = ANY(${readingIds}::uuid[])
    ORDER BY v."zone"`;
}
