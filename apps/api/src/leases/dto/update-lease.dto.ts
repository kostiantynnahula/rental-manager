import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

// Omitted field = unchanged; endDate/notes: null = clear (endDate null makes the lease open-ended).
export class UpdateLeaseDto {
  @ApiPropertyOptional({ format: 'date', example: '2026-01-01' })
  @IsOptional()
  @IsDateOnly()
  startDate?: string;

  @ApiPropertyOptional({ type: String, format: 'date', nullable: true, example: '2026-12-31' })
  @IsOptional()
  @IsDateOnly()
  endDate?: string | null;

  @ApiPropertyOptional({ example: 1600000, description: 'Integer kopiyky (UAH)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  monthlyRent?: number;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  notes?: string | null;
}
