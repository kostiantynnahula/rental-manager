import { ReadingKind, ReadingStatus } from '../../generated/prisma/enums.js';
import { PeriodReadingStatus } from '../constants/period-reading-status.js';

type Candidate = { kind: ReadingKind; status: ReadingStatus; createdAt: Date };

// Which reading represents a meter for a period: a CONFIRMED REGULAR, or a CONFIRMED FINAL (a
// removed meter's last month); otherwise the newest DRAFT REGULAR. INITIAL and CANCELLED don't count.
export function pickPeriodReading<T extends Candidate>(
  readings: ReadonlyArray<T>,
): { status: PeriodReadingStatus; reading: T | null } {
  const confirmed = readings.find(
    (r) =>
      r.status === ReadingStatus.CONFIRMED &&
      (r.kind === ReadingKind.REGULAR || r.kind === ReadingKind.FINAL),
  );
  if (confirmed) return { status: PeriodReadingStatus.CONFIRMED, reading: confirmed };
  const draft = readings
    .filter((r) => r.status === ReadingStatus.DRAFT && r.kind === ReadingKind.REGULAR)
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    .at(0);
  if (draft) return { status: PeriodReadingStatus.DRAFT, reading: draft };
  return { status: PeriodReadingStatus.MISSING, reading: null };
}
