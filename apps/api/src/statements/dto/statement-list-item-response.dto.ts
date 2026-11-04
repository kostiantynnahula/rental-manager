import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import type { Statement } from '../../generated/prisma/client.js';
import { StatementStatus } from '../../generated/prisma/enums.js';

export class StatementListItemResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({ enum: StatementStatus, enumName: 'StatementStatus' })
  status: StatementStatus;

  @ApiProperty({ example: 1586400, description: 'Integer kopiyky' })
  totalAmount: number;

  @ApiProperty({ example: 0 })
  warningsCount: number;

  @ApiProperty()
  issuedAt: Date;

  static from(s: Statement): StatementListItemResponseDto {
    return {
      id: s.id,
      period: formatPeriod(s.period),
      status: s.status,
      totalAmount: s.totalAmount,
      warningsCount: (s.warnings as unknown[]).length,
      issuedAt: s.issuedAt,
    };
  }
}
