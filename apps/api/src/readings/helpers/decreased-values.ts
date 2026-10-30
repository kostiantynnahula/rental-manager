import { Prisma } from '../../generated/prisma/client.js';
import { Zone } from '../../generated/prisma/enums.js';

// Confirmed values never decrease within one meter and zone. Compares as Decimal, never as number.
// Returns one description per zone that went down, e.g. "DAY: 1500.000 < 1520.350"; empty = OK.
export function decreasedZones(
  previous: ReadonlyArray<{ zone: Zone; value: Prisma.Decimal }>,
  next: ReadonlyArray<{ zone: Zone; value: string }>,
): string[] {
  return next.flatMap(({ zone, value }) => {
    const before = previous.find((p) => p.zone === zone)?.value;
    const after = new Prisma.Decimal(value);
    return before && after.lt(before)
      ? [`${zone}: ${after.toFixed(3)} < ${before.toFixed(3)}`]
      : [];
  });
}

// Mirror of decreasedZones: values must not exceed the next confirmed reading (when a past
// period is filled in later). Returns e.g. "DAY: 1600.000 > 1520.350"; empty = OK.
export function exceededZones(
  next: ReadonlyArray<{ zone: Zone; value: Prisma.Decimal }>,
  values: ReadonlyArray<{ zone: Zone; value: string }>,
): string[] {
  return values.flatMap(({ zone, value }) => {
    const limit = next.find((n) => n.zone === zone)?.value;
    const candidate = new Prisma.Decimal(value);
    return limit && candidate.gt(limit)
      ? [`${zone}: ${candidate.toFixed(3)} > ${limit.toFixed(3)}`]
      : [];
  });
}
