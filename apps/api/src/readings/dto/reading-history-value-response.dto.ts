import { ApiProperty } from '@nestjs/swagger';
import { ReadingSource, Zone } from '../../generated/prisma/enums.js';
import type { ReadingHistoryValueRow } from '../interfaces/reading-history-value-row.interface.js';

export class ReadingHistoryValueResponseDto {
  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string with 3 decimals' })
  value: string;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '120.000',
    description:
      'Since the previous confirmed reading of the meter and zone; null if there is none',
  })
  consumption: string | null;

  @ApiProperty({ enum: ReadingSource, enumName: 'ReadingSource' })
  source: ReadingSource;

  @ApiProperty({
    type: String,
    nullable: true,
    format: 'uuid',
    description: 'Photo the value was read from (source PHOTO)',
  })
  photoId: string | null;

  static from(v: ReadingHistoryValueRow): ReadingHistoryValueResponseDto {
    return {
      zone: v.zone,
      value: v.value.toFixed(3),
      consumption: v.consumption?.toFixed(3) ?? null,
      source: v.source,
      photoId: v.photoId,
    };
  }
}
