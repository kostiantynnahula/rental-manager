import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import {
  APARTMENT_TARIFF_SCOPES,
  type ApartmentTariffScope,
} from '../constants/apartment-tariff-scopes.js';

export class ListApartmentTariffsQueryDto {
  @ApiPropertyOptional({
    enum: APARTMENT_TARIFF_SCOPES,
    default: 'current',
    description: 'current = not ended before this month (planned included); all = also ended',
  })
  @IsOptional()
  @IsIn(APARTMENT_TARIFF_SCOPES)
  scope: ApartmentTariffScope = 'current';
}
