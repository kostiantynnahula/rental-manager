import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { formatPeriod } from '../../common/helpers/period.js';
import { ReadingKind } from '../../generated/prisma/enums.js';
import type { MeterWithLastReading } from '../helpers/last-confirmed-reading.js';
import { ReadingValueResponseDto } from './reading-value-response.dto.js';

// A confirmed reading as shown next to its meter (e.g. the meter's last values).
export class ReadingSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ReadingKind, enumName: 'ReadingKind' })
  kind: ReadingKind;

  @ApiProperty({ example: '2026-10', description: 'Month the reading is for (YYYY-MM)' })
  period: string;

  @ApiProperty({ format: 'date', example: '2026-10-28' })
  readingDate: string;

  @ApiProperty({ type: [ReadingValueResponseDto] })
  values: ReadingValueResponseDto[];

  static from(r: MeterWithLastReading['readings'][number]): ReadingSummaryResponseDto {
    return {
      id: r.id,
      kind: r.kind,
      period: formatPeriod(r.period),
      readingDate: formatDateOnly(r.readingDate),
      values: r.values.map((v) => ReadingValueResponseDto.from(v)),
    };
  }
}
