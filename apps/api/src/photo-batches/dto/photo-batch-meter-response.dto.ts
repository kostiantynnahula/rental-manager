import { ApiProperty } from '@nestjs/swagger';
import type { Meter } from '../../generated/prisma/client.js';
import { UtilityType, ZoneScheme } from '../../generated/prisma/enums.js';

export class PhotoBatchMeterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  utility: UtilityType;

  @ApiProperty({ type: String, nullable: true, example: 'kitchen' })
  label: string | null;

  @ApiProperty({ type: String, nullable: true })
  serialNumber: string | null;

  @ApiProperty({ enum: ZoneScheme, enumName: 'ZoneScheme' })
  zoneScheme: ZoneScheme;

  static from(m: Meter): PhotoBatchMeterResponseDto {
    return {
      id: m.id,
      utility: m.utility,
      label: m.label,
      serialNumber: m.serialNumber,
      zoneScheme: m.zoneScheme,
    };
  }
}
