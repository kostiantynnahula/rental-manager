import type { ReadingValue, ReadingValueInput } from '@/lib/api/queries/readings';
import { zonesFor, type ZoneScheme } from '@/lib/utilities';

// A draft's PATCH body: its stored values (with their photos) plus the new ones; a new value replaces the
// stored one of its zone. In the scheme's zone order.
export function mergeDraftValues(
  scheme: ZoneScheme,
  draft: ReadonlyArray<ReadingValue>,
  next: ReadonlyArray<ReadingValueInput>,
): ReadingValueInput[] {
  const kept = draft
    .filter((d) => !next.some((n) => n.zone === d.zone))
    .map((d) => ({ zone: d.zone, value: d.value, ...(d.photoId && { photoId: d.photoId }) }));
  const all = [...kept, ...next];
  return zonesFor(scheme).flatMap((zone) => all.filter((v) => v.zone === zone));
}
