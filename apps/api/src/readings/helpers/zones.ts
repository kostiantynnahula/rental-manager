import { Zone, ZoneScheme } from '../../generated/prisma/enums.js';

const ZONES_BY_SCHEME: Record<ZoneScheme, Zone[]> = {
  [ZoneScheme.SINGLE]: [Zone.TOTAL],
  [ZoneScheme.DAY_NIGHT]: [Zone.DAY, Zone.NIGHT],
};

export function expectedZones(scheme: ZoneScheme): Zone[] {
  return ZONES_BY_SCHEME[scheme];
}

// Zones of the meter that `values` doesn't cover yet (in scheme order).
export function missingZones(scheme: ZoneScheme, values: ReadonlyArray<{ zone: Zone }>): Zone[] {
  return expectedZones(scheme).filter((zone) => !values.some((v) => v.zone === zone));
}

// A DRAFT may hold a subset of the meter's zones, but no zone the meter doesn't have and none twice.
// Returns an error message (the caller picks the exception), or undefined if the values are fine.
export function zonesInvalid(
  scheme: ZoneScheme,
  values: ReadonlyArray<{ zone: Zone }>,
): string | undefined {
  const expected = expectedZones(scheme);
  const given = values.map((v) => v.zone);
  const unknown = [...new Set(given.filter((zone) => !expected.includes(zone)))];
  if (unknown.length > 0) {
    return `values: ${unknown.join(', ')} is not a zone of a ${scheme} meter (expected ${expected.join(' and ')})`;
  }
  const duplicates = [...new Set(given.filter((zone, i) => given.indexOf(zone) !== i))];
  if (duplicates.length > 0) return `values: ${duplicates.join(', ')} given more than once`;
  return undefined;
}

// Values must cover exactly the meter's zones: none missing, none extra, none twice (confirmed readings).
// Returns an error message (the caller picks the exception), or undefined if they match.
export function zonesMismatch(
  scheme: ZoneScheme,
  values: ReadonlyArray<{ zone: Zone }>,
): string | undefined {
  const invalid = zonesInvalid(scheme, values);
  if (invalid) return invalid;
  const missing = missingZones(scheme, values);
  return missing.length === 0
    ? undefined
    : `values must contain exactly ${expectedZones(scheme).join(' and ')} for a ${scheme} meter (${missing.join(', ')} missing)`;
}
