import type { ReadingValueField } from '@/components/meters/helpers/reading-values-schema';

// Same zones with the same typed text (e.g. a prefilled draft nobody edited).
export function sameFields(
  a: ReadonlyArray<ReadingValueField>,
  b: ReadonlyArray<ReadingValueField>,
): boolean {
  return a.length === b.length && a.every((v, i) => v.zone === b[i].zone && v.value === b[i].value);
}
