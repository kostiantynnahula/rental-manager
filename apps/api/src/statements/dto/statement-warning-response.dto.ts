import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { UtilityType, Zone } from '../../generated/prisma/enums.js';
import { STATEMENT_WARNING_CODES, type StatementWarningCode } from '../constants/statement.js';
import type { StatementWarning } from '../interfaces/statement-warning.interface.js';

export class StatementWarningResponseDto {
  @ApiProperty({
    enum: STATEMENT_WARNING_CODES,
    enumName: 'StatementWarningCode',
    description:
      'MISSING_READING: meterId, utility, label. NO_PRICE: tariffId, tariffName, zone. NO_METERS: tariffId, tariffName. MULTIPLE_LEASES: no details',
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

  static from(w: StatementWarning): StatementWarningResponseDto {
    return { ...w };
  }
}
