import { zonesFor, type ZoneScheme } from '@/lib/utilities';
import type { ReadingValueField } from './reading-values-schema';

// Blank inputs for every zone of the scheme (e.g. after switching SINGLE ↔ DAY_NIGHT).
export function emptyValues(scheme: ZoneScheme): ReadingValueField[] {
  return zonesFor(scheme).map((zone) => ({ zone, value: '' }));
}
