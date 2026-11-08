import type { ReadingKind, UtilityType } from '../../generated/prisma/enums.js';

// One reading of the history page (raw SQL row, readings JOIN meters).
export interface ReadingHistoryRow {
  id: string;
  meterId: string;
  period: Date;
  readingDate: Date;
  kind: ReadingKind;
  photoId: string | null;
  utility: UtilityType;
  label: string | null;
  serialNumber: string | null;
  removedAt: Date | null;
}
