import { ApiProperty } from '@nestjs/swagger';
import type { ReadingValue } from '../../generated/prisma/client.js';
import { ReadingSource, Zone } from '../../generated/prisma/enums.js';

// A stored value with where it came from (a reading may link one photo per value).
export class ReadingValueDetailResponseDto {
  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string with 3 decimals' })
  value: string;

  @ApiProperty({ enum: ReadingSource, enumName: 'ReadingSource' })
  source: ReadingSource;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Photo the value was read from (source PHOTO)',
  })
  photoId: string | null;

  static from(
    v: Pick<ReadingValue, 'zone' | 'value' | 'source' | 'photoId'>,
  ): ReadingValueDetailResponseDto {
    return { zone: v.zone, value: v.value.toFixed(3), source: v.source, photoId: v.photoId };
  }
}
