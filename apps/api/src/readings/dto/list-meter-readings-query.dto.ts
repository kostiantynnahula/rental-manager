import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';

export class ListMeterReadingsQueryDto {
  @ApiPropertyOptional({ example: '2026-01', description: 'First period (inclusive)' })
  @IsOptional()
  @IsPeriod()
  from?: string;

  @ApiPropertyOptional({ example: '2026-12', description: 'Last period (inclusive)' })
  @IsOptional()
  @IsPeriod()
  to?: string;

  @ApiPropertyOptional({ enum: ['true', 'false'], default: 'false' })
  @IsOptional()
  @IsIn(['true', 'false'])
  includeCancelled: 'true' | 'false' = 'false';
}
