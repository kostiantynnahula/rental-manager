import type { ConditionPhotoDescription } from '../../condition-photos/interfaces/condition-photo-description.interface.js';

// The expected item names that no described item contains (case-insensitive substring of the item's name), in the
// order given. "мийка" is found in "мийка (раковина)"; blank expectations are ignored.
export function missingItems(
  expected: string[],
  items: ConditionPhotoDescription['items'],
): string[] {
  const names = items.map((i) => i.name.toLowerCase());
  return expected
    .map((e) => e.trim())
    .filter((e) => e && !names.some((n) => n.includes(e.toLowerCase())));
}
