import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import { ReadingKind, ReadingStatus, Zone } from '../../generated/prisma/enums.js';
import type { PhotoReading } from '../interfaces/photo-reading.interface.js';

// A reading linked to a photo (details via GET /readings/:id).
export class PhotoReadingResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  meterId: string;

  @ApiProperty({ enum: ReadingKind, enumName: 'ReadingKind' })
  kind: ReadingKind;

  @ApiProperty({ enum: ReadingStatus, enumName: 'ReadingStatus' })
  status: ReadingStatus;

  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({
    enum: Zone,
    enumName: 'Zone',
    isArray: true,
    description: 'Zones whose values were read from this photo',
  })
  zones: Zone[];

  static from({ reading: r, zones }: PhotoReading): PhotoReadingResponseDto {
    return {
      id: r.id,
      meterId: r.meterId,
      kind: r.kind,
      status: r.status,
      period: formatPeriod(r.period),
      zones,
    };
  }
}
