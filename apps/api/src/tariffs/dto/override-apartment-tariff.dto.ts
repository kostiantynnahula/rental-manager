import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { OverridePriceInputDto } from './override-price-input.dto.js';

// "Only for this apartment": a copy of the shared tariff with its own prices from `effectiveFrom` on.
export class OverrideApartmentTariffDto {
  @ApiProperty({
    example: 'Електроенергія (Shevchenka 12/5)',
    description: 'Name of the copy (unique)',
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({
    example: '2027-01',
    description: 'First month of the own prices; must be within the attachment',
  })
  @IsPeriod()
  effectiveFrom: string;

  @ApiProperty({
    type: [OverridePriceInputDto],
    description: 'Prices of the copy from effectiveFrom; must include TOTAL',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(3)
  @ValidateNested({ each: true })
  @Type(() => OverridePriceInputDto)
  prices: OverridePriceInputDto[];
}
