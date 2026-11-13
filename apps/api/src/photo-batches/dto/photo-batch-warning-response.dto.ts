import { ApiProperty } from '@nestjs/swagger';
import { CONSUMPTION_WARNINGS, type ConsumptionWarning } from '@rental/shared';
import type { BatchSummaryWarning } from '../interfaces/batch-summary-warning.interface.js';

// A consumption warning as a code + what the client needs to word it.
export class PhotoBatchWarningResponseDto {
  @ApiProperty({ enum: CONSUMPTION_WARNINGS, enumName: 'ConsumptionWarningReason' })
  code: ConsumptionWarning;

  @ApiProperty({
    type: Number,
    nullable: true,
    example: 130,
    description:
      'Usual monthly limit of the utility + zone (ABOVE_LIMIT); null for ZERO_CONSUMPTION',
  })
  limit: number | null;

  @ApiProperty({ example: 1, description: 'Months since the previous reading (≥ 1)' })
  months: number;

  static from(w: BatchSummaryWarning): PhotoBatchWarningResponseDto {
    return { code: w.code, limit: w.limit, months: w.months };
  }
}
