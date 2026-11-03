import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { ArrayMaxSize, IsArray, IsIn, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import {
  READING_HISTORY_DEFAULT_PAGE_SIZE,
  READING_HISTORY_PAGE_SIZES,
  type ReadingHistoryPageSize,
} from '../constants/reading-history.js';

export class ApartmentReadingHistoryQueryDto {
  @ApiPropertyOptional({ example: '2026-01', description: 'First period (inclusive)' })
  @IsOptional()
  @IsPeriod()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12', description: 'Last period (inclusive)' })
  @IsOptional()
  @IsPeriod()
  to?: string;

  @ApiPropertyOptional({
    type: [String],
    format: 'uuid',
    description: 'Only these meters (repeat the param: ?meterIds=a&meterIds=b)',
  })
  @IsOptional()
  // A single ?meterIds=… arrives as a string.
  @Transform(({ value }: { value: unknown }) => (Array.isArray(value) ? value : [value]))
  @IsArray()
  @ArrayMaxSize(50)
  @IsUUID('all', { each: true })
  meterIds?: string[];

  @ApiPropertyOptional({ minimum: 1, default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  page: number = 1;

  @ApiPropertyOptional({
    enum: READING_HISTORY_PAGE_SIZES,
    default: READING_HISTORY_DEFAULT_PAGE_SIZE,
  })
  @IsOptional()
  @Type(() => Number)
  @IsIn(READING_HISTORY_PAGE_SIZES)
  pageSize: ReadingHistoryPageSize = READING_HISTORY_DEFAULT_PAGE_SIZE;
}
