import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { IsReadingValues } from '../validators/is-reading-values.decorator.js';
import { ReadingDraftValueInputDto } from './reading-draft-value-input.dto.js';

export class CreateReadingDto {
  @ApiProperty({ example: '2026-10', description: 'Month the reading is for' })
  @IsPeriod()
  period: string;

  @ApiProperty({
    format: 'date',
    example: '2026-10-28',
    description: 'From the 1st of the period to the end of the next month; not in the future',
  })
  @IsDateOnly()
  readingDate: string;

  @ApiProperty({
    type: [ReadingDraftValueInputDto],
    description:
      'A DRAFT may hold a subset of the meter zones (no unknown or duplicate ones); confirm needs all of them',
  })
  @IsReadingValues(ReadingDraftValueInputDto)
  values: ReadingDraftValueInputDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;

  @ApiPropertyOptional({
    default: false,
    description: 'true = create CONFIRMED right away (manual entry); default DRAFT',
  })
  @IsOptional()
  @IsBoolean()
  confirm?: boolean;
}
