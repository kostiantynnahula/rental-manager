import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ReplaceLeaseTenantsDto } from './replace-lease-tenants.dto.js';

export class CreateLeaseDto extends ReplaceLeaseTenantsDto {
  @ApiProperty({ format: 'date', example: '2026-01-01' })
  @IsDateOnly()
  startDate: string;

  @ApiPropertyOptional({
    format: 'date',
    example: '2026-12-31',
    description: 'Inclusive last day; omit for open-ended',
  })
  @IsOptional()
  @IsDateOnly()
  endDate?: string;

  @ApiProperty({ example: 1500000, description: 'Integer kopiyky (UAH)' })
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  monthlyRent: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}
