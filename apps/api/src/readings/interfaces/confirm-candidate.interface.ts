import type { Zone } from '../../generated/prisma/enums.js';

// The REGULAR reading about to be confirmed. id is absent when it's created confirmed.
export interface ConfirmCandidate {
  id?: string;
  period: Date;
  readingDate: Date;
  // Decimal strings, as in the API ("1520.350").
  values: ReadonlyArray<{ zone: Zone; value: string }>;
}
