import type { ConditionPhotoDescription } from '../../condition-photos/interfaces/condition-photo-description.interface.js';

type Item = ConditionPhotoDescription['items'][number];

// One item for describe:samples: `назва ×N — стан` (×N only when > 1, `— стан` only when there is one).
export function formatItem({ name, count, condition }: Item): string {
  const times = count && count > 1 ? ` ×${count}` : '';
  const state = condition?.trim() ? ` — ${condition.trim()}` : '';
  return `${name}${times}${state}`;
}

// The description as printed lines (indented under the file name): items first, then the summary.
export function formatDescription({ items, summary }: ConditionPhotoDescription): string[] {
  const lines = items.length > 0 ? items.map((i) => `  - ${formatItem(i)}`) : ['  (no items)'];
  return [...lines, `  summary: ${summary}`];
}
