import { ApiProperty } from '@nestjs/swagger';
import { formatPeriod } from '../../common/helpers/period.js';
import { StatementStatus } from '../../generated/prisma/enums.js';
import type { StatementWithDetails } from '../helpers/statement-with-details.js';
import type { StatementWarning } from '../interfaces/statement-warning.interface.js';
import { StatementLeaseSummaryResponseDto } from './statement-lease-summary-response.dto.js';
import { StatementLineResponseDto } from './statement-line-response.dto.js';
import { StatementWarningResponseDto } from './statement-warning-response.dto.js';

export class StatementResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ example: '2026-10' })
  period: string;

  @ApiProperty({ enum: StatementStatus, enumName: 'StatementStatus' })
  status: StatementStatus;

  @ApiProperty({ example: 1586400, description: 'Integer kopiyky: the sum of the line amounts' })
  totalAmount: number;

  @ApiProperty({
    type: [StatementWarningResponseDto],
    description: 'As of issue time',
  })
  warnings: StatementWarningResponseDto[];

  @ApiProperty({ type: [StatementLineResponseDto], description: 'In display order' })
  lines: StatementLineResponseDto[];

  @ApiProperty({
    type: StatementLeaseSummaryResponseDto,
    nullable: true,
    description: 'The lease used for the rent line',
  })
  lease: StatementLeaseSummaryResponseDto | null;

  @ApiProperty()
  issuedAt: Date;

  @ApiProperty({ format: 'uuid' })
  issuedById: string;

  @ApiProperty({ type: Date, nullable: true })
  cancelledAt: Date | null;

  @ApiProperty({ type: String, format: 'uuid', nullable: true })
  cancelledById: string | null;

  @ApiProperty({ type: String, nullable: true })
  cancelNote: string | null;

  static from(s: StatementWithDetails): StatementResponseDto {
    return {
      id: s.id,
      apartmentId: s.apartmentId,
      period: formatPeriod(s.period),
      status: s.status,
      totalAmount: s.totalAmount,
      warnings: (s.warnings as unknown as StatementWarning[]).map((w) =>
        StatementWarningResponseDto.from(w),
      ),
      lines: s.lines.map((l) => StatementLineResponseDto.fromRow(l)),
      lease: s.lease && StatementLeaseSummaryResponseDto.from(s.lease),
      issuedAt: s.issuedAt,
      issuedById: s.issuedById,
      cancelledAt: s.cancelledAt,
      cancelledById: s.cancelledById,
      cancelNote: s.cancelNote,
    };
  }
}
