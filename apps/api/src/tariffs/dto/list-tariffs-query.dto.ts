import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { TariffKind, UtilityType } from '../../generated/prisma/enums.js';
import {
  TARIFF_ACTIVE_FILTERS,
  TARIFF_LIST_DEFAULT_PAGE_SIZE,
  TARIFF_LIST_PAGE_SIZES,
  type TariffActiveFilter,
  type TariffListPageSize,
} from '../constants/tariff-list.js';

export class ListTariffsQueryDto {
  @ApiPropertyOptional({ description: 'Substring of the name (case-insensitive)' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  search?: string;

  @ApiPropertyOptional({ enum: TariffKind, enumName: 'TariffKind' })
  @IsOptional()
  @IsEnum(TariffKind)
  kind?: TariffKind;

  @ApiPropertyOptional({
    enum: UtilityType,
    enumName: 'UtilityType',
    description: 'Tariffs billing this utility',
  })
  @IsOptional()
  @IsEnum(UtilityType)
  utility?: UtilityType;

  @ApiPropertyOptional({ enum: TARIFF_ACTIVE_FILTERS, default: 'true' })
  @IsOptional()
  @IsIn(TARIFF_ACTIVE_FILTERS)
  active: TariffActiveFilter = 'true';

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  page: number = 1;

  @ApiPropertyOptional({ enum: TARIFF_LIST_PAGE_SIZES, default: TARIFF_LIST_DEFAULT_PAGE_SIZE })
  @IsOptional()
  @Type(() => Number)
  @IsIn(TARIFF_LIST_PAGE_SIZES)
  pageSize: TariffListPageSize = TARIFF_LIST_DEFAULT_PAGE_SIZE;
}
