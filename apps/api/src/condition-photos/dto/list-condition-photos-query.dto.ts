import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';

// All optional; no params = every photo of the apartment. from/to filter takenOn, both inclusive.
export class ListConditionPhotosQueryDto {
  @ApiPropertyOptional({ enum: ConditionPhotoEvent, enumName: 'ConditionPhotoEvent' })
  @IsOptional()
  @IsEnum(ConditionPhotoEvent)
  event?: ConditionPhotoEvent;

  @ApiPropertyOptional({ format: 'date', example: '2026-01-01', description: 'takenOn ≥ from' })
  @IsOptional()
  @IsDateOnly()
  from?: string;

  @ApiPropertyOptional({ format: 'date', example: '2026-12-31', description: 'takenOn ≤ to' })
  @IsOptional()
  @IsDateOnly()
  to?: string;
}
