import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';
import type { ReadingConsumptionRow } from '../interfaces/reading-consumption-row.interface.js';

// View rows → per-reading consumption by zone; null when there is no previous confirmed value (e.g. INITIAL).
export function consumptionByReading(
  rows: ReadonlyArray<ReadingConsumptionRow>,
): Map<string, { zone: Zone; value: Prisma.Decimal }[] | null> {
  const byReading = new Map<string, ReadingConsumptionRow[]>();
  for (const row of rows) byReading.set(row.readingId, [...(byReading.get(row.readingId) ?? []), row]);

  const result = new Map<string, { zone: Zone; value: Prisma.Decimal }[] | null>();
  for (const [readingId, values] of byReading) {
    const zones = values.flatMap(({ zone, consumption }) =>
      consumption === null ? [] : [{ zone, value: consumption }],
    );
    result.set(readingId, zones.length === values.length ? zones : null);
  }
  return result;
}
