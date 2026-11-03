import { PartialType } from '@nestjs/swagger';
import { TariffPriceInputDto } from './tariff-price-input.dto.js';

// Fixes a mistyped price. A price change is a new row (POST /tariffs/:id/prices), not an edit.
export class UpdateTariffPriceDto extends PartialType(TariffPriceInputDto) {}
