import { ApiProperty } from '@nestjs/swagger';
import { UtilityType } from '../../generated/prisma/enums.js';
import type { StatementLineMeter } from '../interfaces/statement-line-meter.interface.js';

export class StatementLineMeterResponseDto {
  @ApiProperty({ format: 'uuid' })
  meterId: string;

  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  utility: UtilityType;

  @ApiProperty({ type: String, nullable: true, example: 'кухня' })
  label: string | null;

  @ApiProperty({ type: String, nullable: true })
  serialNumber: string | null;

  @ApiProperty({ example: '12.350', description: 'Decimal string with 3 decimals' })
  consumption: string;

  static from(m: StatementLineMeter): StatementLineMeterResponseDto {
    return {
      meterId: m.meterId,
      utility: m.utility,
      label: m.label,
      serialNumber: m.serialNumber,
      consumption: m.consumption.toFixed(3),
    };
  }
}
