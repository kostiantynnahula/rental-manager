import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import type { StatementPreview } from '../interfaces/statement-preview.interface.js';
import { StatementLineResponseDto } from './statement-line-response.dto.js';
import { StatementWarningResponseDto } from './statement-warning-response.dto.js';

export class StatementPreviewResponseDto {
  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({ example: 1586400, description: 'Integer kopiyky: the sum of the line amounts' })
  total: number;

  @ApiProperty({
    type: [StatementLineResponseDto],
    description: 'Rent, then metered by utility and zone (DAY, NIGHT, TOTAL), then fixed by name',
  })
  lines: StatementLineResponseDto[];

  @ApiProperty({
    type: [StatementWarningResponseDto],
    description: 'What the total is missing: skipped lines and meters without a reading',
  })
  warnings: StatementWarningResponseDto[];

  static from(p: StatementPreview, period: Date): StatementPreviewResponseDto {
    return {
      period: formatPeriod(period),
      total: p.total,
      lines: p.lines.map((l) => StatementLineResponseDto.from(l)),
      warnings: p.warnings.map((w) => StatementWarningResponseDto.from(w)),
    };
  }
}
