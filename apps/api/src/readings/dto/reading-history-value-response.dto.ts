import { ApiProperty } from '@nestjs/swagger';
import { CONSUMPTION_WARNINGS, type ConsumptionWarning } from '@rental/shared';
import { ReadingSource, Zone } from '../../generated/prisma/enums.js';
import type { ReadingHistoryItem } from '../interfaces/reading-history-item.interface.js';

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

  @ApiProperty({
    enum: CONSUMPTION_WARNINGS,
    enumName: 'ConsumptionWarningReason',
    isArray: true,
    description:
      'Shared consumption rule (limit per month × months since the previous reading; zero electricity while a lease covers the period); empty = fine',
  })
  warnings: ConsumptionWarning[];

  static from(v: ReadingHistoryItem['values'][number]): ReadingHistoryValueResponseDto {
    return {
      zone: v.zone,
      value: v.value.toFixed(3),
      consumption: v.consumption?.toFixed(3) ?? null,
      source: v.source,
      photoId: v.photoId,
      warnings: v.warnings,
    };
  }
}
