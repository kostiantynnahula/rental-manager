import { ApiProperty } from '@nestjs/swagger';
import { UtilityType } from '../../generated/prisma/enums.js';
import type { ReadingHistoryRow } from '../interfaces/reading-history-row.interface.js';

export class ReadingHistoryMeterResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  utility: UtilityType;

  @ApiProperty({ type: String, nullable: true })
  label: string | null;

  @ApiProperty({ type: String, nullable: true })
  serialNumber: string | null;

  @ApiProperty({ description: 'The meter has been removed (replaced or taken out)' })
  removed: boolean;

  static from(r: ReadingHistoryRow): ReadingHistoryMeterResponseDto {
    return {
      id: r.meterId,
      utility: r.utility,
      label: r.label,
      serialNumber: r.serialNumber,
      removed: r.removedAt !== null,
    };
  }
}
