import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { formatPeriod } from '../../common/helpers/period.js';
import { ReadingStatus, Zone } from '../../generated/prisma/enums.js';
import type { BatchSummaryReading } from '../interfaces/batch-summary-reading.interface.js';
import { PhotoBatchMeterResponseDto } from './photo-batch-meter-response.dto.js';
import { PhotoBatchValueResponseDto } from './photo-batch-value-response.dto.js';

export class PhotoBatchReadingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ReadingStatus, enumName: 'ReadingStatus' })
  status: ReadingStatus;

  @ApiProperty({ example: '2026-10', description: 'Month the reading is for (YYYY-MM)' })
  period: string;

  @ApiProperty({ format: 'date', example: '2026-10-28' })
  readingDate: string;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty({ type: PhotoBatchMeterResponseDto })
  meter: PhotoBatchMeterResponseDto;

  @ApiProperty({
    description:
      'DRAFT, no zone missing, none lower than the previous value. Other rules (dates, a confirmed reading of ' +
      'the same period) are still checked by the confirm',
  })
  canConfirm: boolean;

  @ApiProperty({
    enum: Zone,
    enumName: 'Zone',
    isArray: true,
    description: 'Zones of the meter the reading does not have yet',
  })
  missingZones: Zone[];

  @ApiProperty({ type: [PhotoBatchValueResponseDto], description: "In the meter's zone order" })
  values: PhotoBatchValueResponseDto[];

  static from(r: BatchSummaryReading): PhotoBatchReadingResponseDto {
    return {
      id: r.reading.id,
      status: r.reading.status,
      period: formatPeriod(r.reading.period),
      readingDate: formatDateOnly(r.reading.readingDate),
      note: r.reading.note,
      meter: PhotoBatchMeterResponseDto.from(r.meter),
      canConfirm: r.canConfirm,
      missingZones: r.missingZones,
      values: r.values.map((v) => PhotoBatchValueResponseDto.from(v)),
    };
  }
}
