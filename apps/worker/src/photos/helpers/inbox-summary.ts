import type { ReadingMatch } from '../interfaces/reading-match.interface.js';
import { DIFFERENT_APARTMENTS_SKIP } from './one-apartment.js';

// First line of an inbox photo's NOT_MATCHED note, for the owner (shown in the web, so Ukrainian); the detail lines
// follow. null when the detail lines say enough (nothing read at all, or matched but refused by the API).
export function inboxSummary(matches: ReadonlyArray<ReadingMatch>): string | null {
  if (matches.some((m) => m.skip === DIFFERENT_APARTMENTS_SKIP)) {
    return 'Лічильники різних квартир на одному фото';
  }
  if (matches.length > 0 && matches.every((m) => !m.meter)) {
    return 'Серійний номер не знайдено серед активних лічильників';
  }
  return null;
}
