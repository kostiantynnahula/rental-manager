import { Zone, ZoneScheme } from '../../generated/prisma/enums.js';

const ZONES_BY_SCHEME: Record<ZoneScheme, Zone[]> = {
  [ZoneScheme.SINGLE]: [Zone.TOTAL],
  [ZoneScheme.DAY_NIGHT]: [Zone.DAY, Zone.NIGHT],
};

export function expectedZones(scheme: ZoneScheme): Zone[] {
  return ZONES_BY_SCHEME[scheme];
}

// Values must cover exactly the meter's zones: none missing, none extra, none twice.
// Returns an error message (the caller picks the exception), or undefined if they match.
export function zonesMismatch(
  scheme: ZoneScheme,
  values: ReadonlyArray<{ zone: Zone }>,
): string | undefined {
  const expected = expectedZones(scheme);
  const given = values.map((v) => v.zone);
  const matches =
    given.length === expected.length && expected.every((zone) => given.includes(zone));
  return matches
    ? undefined
    : `values must contain exactly ${expected.join(' and ')} for a ${scheme} meter (got ${given.join(', ') || 'none'})`;
}
