import { ApiProperty } from '@nestjs/swagger';
import { Zone } from '../../generated/prisma/enums.js';
import type { ReadingValue } from '../../generated/prisma/client.js';

export class ReadingValueResponseDto {
  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string with 3 decimals' })
  value: string;

  static from(v: Pick<ReadingValue, 'zone' | 'value'>): ReadingValueResponseDto {
    return { zone: v.zone, value: v.value.toFixed(3) };
  }
}
