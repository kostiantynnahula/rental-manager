import { ReadingKind } from '../../generated/prisma/enums.js';
import type { ChronoReading } from '../interfaces/chrono-reading.interface.js';

// Chronology of one meter: by readingDate (values grow over time, not by period); on the same day
// INITIAL comes first and FINAL last.
const KIND_RANK: Record<ReadingKind, number> = {
  [ReadingKind.INITIAL]: 0,
  [ReadingKind.REGULAR]: 1,
  [ReadingKind.FINAL]: 2,
};

type Ordered = { id?: string; kind: ReadingKind; readingDate: Date };

export function compareChrono(a: Ordered, b: Ordered): number {
  return a.readingDate.getTime() - b.readingDate.getTime() || KIND_RANK[a.kind] - KIND_RANK[b.kind];
}

// Nearest confirmed reading strictly before / after target (target itself excluded by id).
export function findPreviousConfirmed<T extends ChronoReading>(
  confirmed: ReadonlyArray<T>,
  target: Ordered,
): T | undefined {
  return confirmed
    .filter((r) => r.id !== target.id && compareChrono(r, target) < 0)
    .sort(compareChrono)
    .at(-1);
}

export function findNextConfirmed<T extends ChronoReading>(
  confirmed: ReadonlyArray<T>,
  target: Ordered,
): T | undefined {
  return confirmed
    .filter((r) => r.id !== target.id && compareChrono(r, target) > 0)
    .sort(compareChrono)
    .at(0);
}
