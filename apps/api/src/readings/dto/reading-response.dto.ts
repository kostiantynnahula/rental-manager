import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { formatPeriod } from '../../common/helpers/period.js';
import { ReadingKind, ReadingSource, ReadingStatus } from '../../generated/prisma/enums.js';
import type { ReadingWithConsumption } from '../interfaces/reading-with-consumption.interface.js';
import { ReadingValueResponseDto } from './reading-value-response.dto.js';

export class ReadingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  meterId: string;

  @ApiProperty({ enum: ReadingKind, enumName: 'ReadingKind' })
  kind: ReadingKind;

  @ApiProperty({ enum: ReadingStatus, enumName: 'ReadingStatus' })
  status: ReadingStatus;

  @ApiProperty({ enum: ReadingSource, enumName: 'ReadingSource' })
  source: ReadingSource;

  @ApiProperty({ example: '2026-10', description: 'Month the reading is for (YYYY-MM)' })
  period: string;

  @ApiProperty({ format: 'date', example: '2026-10-28' })
  readingDate: string;

  @ApiProperty({ type: String, nullable: true })
  note: string | null;

  @ApiProperty({ type: [ReadingValueResponseDto] })
  values: ReadingValueResponseDto[];

  @ApiProperty({
    type: [ReadingValueResponseDto],
    nullable: true,
    description: 'Per zone since the previous CONFIRMED reading of this meter; null if none',
  })
  consumption: ReadingValueResponseDto[] | null;

  @ApiProperty({ format: 'uuid' })
  createdById: string;

  @ApiProperty({ type: Date, nullable: true })
  confirmedAt: Date | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  confirmedById: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from({ reading: r, consumption }: ReadingWithConsumption): ReadingResponseDto {
    return {
      id: r.id,
      meterId: r.meterId,
      kind: r.kind,
      status: r.status,
      source: r.source,
      period: formatPeriod(r.period),
      readingDate: formatDateOnly(r.readingDate),
      note: r.note,
      values: r.values.map((v) => ReadingValueResponseDto.from(v)),
      consumption: consumption?.map((c) => ReadingValueResponseDto.from(c)) ?? null,
      createdById: r.createdById,
      confirmedAt: r.confirmedAt,
      confirmedById: r.confirmedById,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}
