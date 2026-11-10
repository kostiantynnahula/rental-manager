import type { ReadingValueField } from '@/components/meters/helpers/reading-values-schema';
import type { ReadingValue } from '@/lib/api/queries/readings';
import { formatMeterValue } from '@/lib/meter-values';
import { zonesFor, type ZoneScheme } from '@/lib/utilities';

// Form inputs for every zone of the meter, prefilled from a draft (a zone it lacks stays blank).
export function draftFields(
  scheme: ZoneScheme,
  values: ReadonlyArray<ReadingValue>,
): ReadingValueField[] {
  return zonesFor(scheme).map((zone) => {
    const stored = values.find((v) => v.zone === zone);
    return { zone, value: stored ? formatMeterValue(stored.value) : '' };
  });
}
