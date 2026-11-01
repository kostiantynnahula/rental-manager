import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

// A new open-ended lease with the new tenant as PRIMARY.
export class NewLeaseAssignmentDto {
  @ApiProperty({ enum: ['NEW_LEASE'] })
  @IsIn(['NEW_LEASE'])
  mode: 'NEW_LEASE';

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  apartmentId: string;

  @ApiProperty({ format: 'date', example: '2026-11-01' })
  @IsDateOnly()
  startDate: string;

  @ApiProperty({ example: 1500000, description: 'Integer kopiyky (UAH)' })
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  monthlyRent: number;

  @ApiPropertyOptional({ description: 'Lease notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
