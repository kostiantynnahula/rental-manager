import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, Max, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';

export class IssueStatementDto {
  @ApiProperty({ example: '2026-10', description: 'YYYY-MM' })
  @IsPeriod()
  period: string;

  @ApiProperty({
    example: 1586400,
    description: 'Integer kopiyky: the preview total the user agreed to',
  })
  @IsInt()
  @Min(0)
  @Max(PG_INT_MAX)
  expectedTotal: number;

  @ApiPropertyOptional({ description: 'Required to issue a statement that has warnings' })
  @IsOptional()
  @IsBoolean()
  acknowledgeWarnings?: boolean;
}
