import { PickType } from '@nestjs/swagger';
import { TariffPriceInputDto } from './tariff-price-input.dto.js';

// A price of the apartment's own copy; the month comes from the override's effectiveFrom.
export class OverridePriceInputDto extends PickType(TariffPriceInputDto, [
  'zone',
  'price',
] as const) {}
