import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { IsReadingValues } from '../validators/is-reading-values.decorator.js';
import { ReadingValueInputDto } from './reading-value-input.dto.js';

// DRAFT readings only. Omitted = unchanged; values replace the whole list; note null = clear.
export class UpdateReadingDto {
  @ApiPropertyOptional({ example: '2026-10' })
  @IsOptional()
  @IsPeriod()
  period?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-10-28' })
  @IsOptional()
  @IsDateOnly()
  readingDate?: string;

  @ApiPropertyOptional({ type: [ReadingValueInputDto] })
  @IsOptional()
  @IsReadingValues()
  values?: ReadingValueInputDto[];

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string | null;
}
