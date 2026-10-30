import type { Prisma } from '../../generated/prisma/client.js';
import type { Zone } from '../../generated/prisma/enums.js';
import type { ReadingWithValues } from '../helpers/reading-with-values.js';

export interface ReadingWithConsumption {
  reading: ReadingWithValues;
  // Per zone since the previous CONFIRMED reading of the meter; null if there is none.
  consumption: { zone: Zone; value: Prisma.Decimal }[] | null;
}
