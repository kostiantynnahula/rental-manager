import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { Zone } from '../../generated/prisma/enums.js';
import { IsPrice } from '../validators/is-price.decorator.js';

export class TariffPriceInputDto {
  @ApiProperty({ example: '2026-11', description: 'First month the price applies to' })
  @IsPeriod()
  effectiveFrom: string;

  // No initializer: UpdateTariffPriceDto (PartialType) would inherit it and reset the zone on PATCH.
  // No Swagger `default` either: openapi-typescript would make the field required in the web types.
  @ApiPropertyOptional({
    enum: Zone,
    enumName: 'Zone',
    description:
      'Default TOTAL. DAY/NIGHT only for an ELECTRICITY tariff; a zone without its own price uses TOTAL',
  })
  @IsOptional()
  @IsEnum(Zone)
  zone?: Zone;

  @ApiProperty({
    example: '4.32',
    description:
      'UAH, decimal string, >= 0, up to 4 decimals: per unit (METERED) or per month (FIXED)',
  })
  @IsPrice()
  price: string;
}
