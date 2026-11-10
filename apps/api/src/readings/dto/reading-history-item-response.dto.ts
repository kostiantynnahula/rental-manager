import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { formatPeriod } from '../../common/helpers/period.js';
import { ReadingKind } from '../../generated/prisma/enums.js';
import type { ReadingHistoryItem } from '../interfaces/reading-history-item.interface.js';
import { ReadingHistoryMeterResponseDto } from './reading-history-meter-response.dto.js';
import { ReadingHistoryValueResponseDto } from './reading-history-value-response.dto.js';

export class ReadingHistoryItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: ReadingHistoryMeterResponseDto })
  meter: ReadingHistoryMeterResponseDto;

  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({ example: '2026-10-28', format: 'date' })
  readingDate: string;

  @ApiProperty({ enum: ReadingKind, enumName: 'ReadingKind' })
  kind: ReadingKind;

  @ApiProperty({
    type: [ReadingHistoryValueResponseDto],
    description: 'Each value carries its own photo (a two-zone reading may link two photos)',
  })
  values: ReadingHistoryValueResponseDto[];

  static from({ reading, values }: ReadingHistoryItem): ReadingHistoryItemResponseDto {
    return {
      id: reading.id,
      meter: ReadingHistoryMeterResponseDto.from(reading),
      period: formatPeriod(reading.period),
      readingDate: formatDateOnly(reading.readingDate),
      kind: reading.kind,
      values: values.map((v) => ReadingHistoryValueResponseDto.from(v)),
    };
  }
}
