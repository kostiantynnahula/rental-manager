import type { ReadingValueField } from '@/components/meters/helpers/reading-values-schema';
import { sameFields } from './same-fields';

// The entry still shows exactly what was prefilled from its meter's draft (nobody typed into it).
export function isUntouchedPrefill(
  entry: { meterId: string; values: ReadingValueField[] },
  prefilled: Readonly<Record<string, ReadingValueField[]>>,
): boolean {
  const fields = prefilled[entry.meterId];
  return !!fields && sameFields(entry.values, fields);
}
