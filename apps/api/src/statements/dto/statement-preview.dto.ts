import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { IsManualAmounts } from '../validators/is-manual-amounts.decorator.js';

// A POST body, not a query: manualAmounts is a map. Preview writes nothing.
export class StatementPreviewDto {
  @ApiProperty({ example: '2026-10', description: 'YYYY-MM' })
  @IsPeriod()
  period: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: { type: 'integer', minimum: 0, maximum: PG_INT_MAX },
    example: { '3f1c2b4e-8d7a-4c1e-9b2a-5e6f7a8b9c0d': 12300 },
    description:
      'Integer kopiyky per MANUAL tariff id, entered from the bill. Only active MANUAL tariffs of the apartment (else 400); a missing one → MISSING_MANUAL_AMOUNT',
  })
  @IsOptional()
  @IsManualAmounts()
  manualAmounts?: Record<string, number>;
}
