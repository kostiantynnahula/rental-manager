import { zonesFor, type Zone, type ZoneScheme } from '@/lib/utilities';

// Zones of the meter a (draft) reading doesn't have yet, in display order. Same rule as the API's
// missingZones(): a DRAFT may hold a subset; confirming needs all of them.
export function missingZones(scheme: ZoneScheme, values: ReadonlyArray<{ zone: Zone }>): Zone[] {
  return zonesFor(scheme).filter((zone) => !values.some((v) => v.zone === zone));
}
