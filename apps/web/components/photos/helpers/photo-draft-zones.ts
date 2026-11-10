import type { ReadingValue } from '@/lib/api/queries/readings';
import type { Zone } from '@/lib/utilities';

// Zones of a draft whose values were read from this photo (e.g. proposed by the worker) — editable on its screen.
export function photoDraftZones(values: ReadonlyArray<ReadingValue>, photoId: string): Zone[] {
  return values.filter((v) => v.photoId === photoId).map((v) => v.zone);
}
