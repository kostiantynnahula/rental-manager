import type { Prisma } from '../../generated/prisma/client.js';
import type { ReadingKind, Zone } from '../../generated/prisma/enums.js';

// A reading as the pure ordering/rule helpers see it (no DB access inside them).
export interface ChronoReading {
  id: string;
  kind: ReadingKind;
  period: Date;
  readingDate: Date;
  values: ReadonlyArray<{ zone: Zone; value: Prisma.Decimal }>;
}
