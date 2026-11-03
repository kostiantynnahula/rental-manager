import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { TariffKind, UtilityType } from '../../generated/prisma/enums.js';
import { TariffPriceInputDto } from './tariff-price-input.dto.js';

export class CreateTariffDto {
  @ApiProperty({ example: 'Електроенергія', description: 'Unique, e.g. "Вивіз сміття (Сихів)"' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  name: string;

  @ApiProperty({ enum: TariffKind, enumName: 'TariffKind' })
  @IsEnum(TariffKind)
  kind: TariffKind;

  // No initializer (default []): UpdateTariffDto (PartialType) would inherit it. No Swagger `default` either:
  // openapi-typescript would make the field required in the web types.
  @ApiPropertyOptional({
    enum: UtilityType,
    enumName: 'UtilityType',
    isArray: true,
    description:
      'Default []. METERED: the billed utilities — ELECTRICITY or GAS alone, or COLD_WATER and/or HOT_WATER (e.g. drainage). FIXED: empty',
  })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(Object.keys(UtilityType).length)
  @ArrayUnique()
  @IsEnum(UtilityType, { each: true })
  utilities?: UtilityType[];

  // null clears the notes on PATCH (@IsOptional skips validation for null/undefined).
  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;

  @ApiProperty({
    type: [TariffPriceInputDto],
    description: 'Initial price history; must include a TOTAL price from the earliest month',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(50)
  @ValidateNested({ each: true })
  @Type(() => TariffPriceInputDto)
  prices: TariffPriceInputDto[];
}
