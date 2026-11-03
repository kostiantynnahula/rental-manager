import type { Zone } from '../../generated/prisma/enums.js';

// The part of a TariffPrice the price rules look at.
export interface TariffPriceRow {
  effectiveFrom: Date;
  zone: Zone;
}
