import { ApiProperty } from '@nestjs/swagger';
import { Meter } from '../../generated/prisma/client.js';
import { UtilityType, ZoneScheme } from '../../generated/prisma/enums.js';

export class MeterSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  utility: UtilityType;

  @ApiProperty({ enum: ZoneScheme, enumName: 'ZoneScheme' })
  zoneScheme: ZoneScheme;

  @ApiProperty({ type: String, nullable: true })
  label: string | null;

  @ApiProperty({ type: String, nullable: true })
  serialNumber: string | null;

  static from(m: Meter): MeterSummaryResponseDto {
    return {
      id: m.id,
      utility: m.utility,
      zoneScheme: m.zoneScheme,
      label: m.label,
      serialNumber: m.serialNumber,
    };
  }
}
