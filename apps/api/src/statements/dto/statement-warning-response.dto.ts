import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CONSUMPTION_WARNINGS, type ConsumptionWarning } from '@rental/shared';
import { UtilityType, Zone } from '../../generated/prisma/enums.js';
import { STATEMENT_WARNING_CODES, type StatementWarningCode } from '../constants/statement.js';
import type { StatementWarning } from '../interfaces/statement-warning.interface.js';

export class StatementWarningResponseDto {
  @ApiProperty({
    enum: STATEMENT_WARNING_CODES,
    enumName: 'StatementWarningCode',
    description:
      'MISSING_READING: meterId, utility, label. NO_PRICE: tariffId, tariffName, zone. NO_METERS: tariffId, tariffName. MULTIPLE_LEASES: no details. UNUSUAL_CONSUMPTION: meterId, utility, label, zone, consumption, limit, months, reason. MISSING_MANUAL_AMOUNT: tariffId, tariffName',
  })
  code: StatementWarningCode;

  @ApiPropertyOptional({ format: 'uuid' })
  meterId?: string;

  @ApiPropertyOptional({ enum: UtilityType, enumName: 'UtilityType' })
  utility?: UtilityType;

  @ApiPropertyOptional({ type: String, nullable: true })
  label?: string | null;

  @ApiPropertyOptional({ format: 'uuid' })
  tariffId?: string;

  @ApiPropertyOptional()
  tariffName?: string;

  @ApiPropertyOptional({ enum: Zone, enumName: 'Zone' })
  zone?: Zone;

  @ApiPropertyOptional({ description: 'Decimal string', example: '340.5' })
  consumption?: string;

  @ApiPropertyOptional({ description: 'Usual consumption per month' })
  limit?: number;

  @ApiPropertyOptional({ description: 'Months since the previous reading (>= 1)' })
  months?: number;

  @ApiPropertyOptional({ enum: CONSUMPTION_WARNINGS, enumName: 'ConsumptionWarningReason' })
  reason?: ConsumptionWarning;

  static from(w: StatementWarning): StatementWarningResponseDto {
    return { ...w };
  }
}
