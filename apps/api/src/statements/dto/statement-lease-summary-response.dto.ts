import { ApiProperty } from '@nestjs/swagger';
import type { StatementWithDetails } from '../helpers/statement-with-details.js';

export class StatementLeaseSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The tenant's current name, not a snapshot",
  })
  primaryTenantName: string | null;

  static from(lease: NonNullable<StatementWithDetails['lease']>): StatementLeaseSummaryResponseDto {
    return { id: lease.id, primaryTenantName: lease.tenants[0]?.tenant.fullName ?? null };
  }
}
