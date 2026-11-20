import { ROOM_LABELS } from '../constants/condition-photo-description.js';
import type { ConditionPhotoDescription } from '../interfaces/condition-photo-description.interface.js';

// The text embedded for a photo: room + summary + items with their condition, e.g.
//   Кімната: кухня.
//   Світла кухня з білими меблями.
//   Предмети: холодильник (подряпина на дверцятах); стілець ×2.
export function embeddingText({ room, summary, items }: ConditionPhotoDescription): string {
  const lines: string[] = [];
  const label = ROOM_LABELS[room];
  if (label) lines.push(`Кімната: ${label}.`);
  lines.push(summary.trim());
  if (items.length) {
    const listed = items.map(({ name, count, condition }) => {
      const times = count && count > 1 ? ` ×${count}` : '';
      const state = condition?.trim() ? ` (${condition.trim()})` : '';
      return `${name.trim()}${times}${state}`;
    });
    lines.push(`Предмети: ${listed.join('; ')}.`);
  }
  return lines.join('\n');
}
