import type { ReadingMatch } from '../interfaces/reading-match.interface.js';

export const DIFFERENT_APARTMENTS_SKIP = 'meters of different apartments on one photo';

// Inbox photo: every matched register must belong to one apartment (the photo gets exactly one). Matches spanning
// several apartments mean a misread serial somewhere — we can't tell which, so none is used.
export function oneApartment(matches: ReadonlyArray<ReadingMatch>): ReadingMatch[] {
  const apartments = new Set(matches.flatMap((m) => (m.meter ? [m.meter.apartmentId] : [])));
  if (apartments.size <= 1) return [...matches];
  return matches.map((m) =>
    m.meter ? { reading: m.reading, skip: DIFFERENT_APARTMENTS_SKIP } : m,
  );
}
