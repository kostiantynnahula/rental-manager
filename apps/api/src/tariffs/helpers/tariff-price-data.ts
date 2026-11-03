import { parsePeriod } from '../../common/helpers/period.js';
import { Zone } from '../../generated/prisma/enums.js';
import type { TariffPriceInputDto } from '../dto/tariff-price-input.dto.js';

// API shape → Prisma data. The price stays a decimal string (Prisma stores it exactly).
export function tariffPriceData(dto: TariffPriceInputDto): {
  effectiveFrom: Date;
  zone: Zone;
  price: string;
} {
  return {
    effectiveFrom: parsePeriod(dto.effectiveFrom),
    zone: dto.zone ?? Zone.TOTAL,
    price: dto.price,
  };
}
