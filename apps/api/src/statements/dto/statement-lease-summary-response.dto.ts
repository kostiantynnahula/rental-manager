import { ApiProperty } from '@nestjs/swagger';
import type { TenantDataOptions } from '../../common/interfaces/tenant-data-options.interface.js';
import type { StatementWithDetails } from '../helpers/statement-with-details.js';

export class StatementLeaseSummaryResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({
    type: String,
    nullable: true,
    description: "The tenant's current name, not a snapshot; always null for API keys",
  })
  primaryTenantName: string | null;

  static from(
    lease: NonNullable<StatementWithDetails['lease']>,
    { withTenants = true }: TenantDataOptions = {},
  ): StatementLeaseSummaryResponseDto {
    return {
      id: lease.id,
      primaryTenantName: withTenants ? (lease.tenants[0]?.tenant.fullName ?? null) : null,
    };
  }
}
