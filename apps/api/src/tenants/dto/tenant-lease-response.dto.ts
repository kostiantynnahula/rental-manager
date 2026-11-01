import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';
import { isLeaseCurrent } from '../helpers/tenant-status.js';
import type { TenantWithLeases } from '../helpers/tenant-with-leases.js';

// One lease as seen from the tenant's side.
export class TenantLeaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  leaseId: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ example: 'Shevchenka 12/5' })
  apartmentName: string;

  @ApiProperty({ format: 'date', example: '2026-01-01' })
  startDate: string;

  @ApiProperty({ type: String, format: 'date', nullable: true })
  endDate: string | null;

  @ApiProperty({ enum: LeaseTenantRole, enumName: 'LeaseTenantRole' })
  role: LeaseTenantRole;

  @ApiProperty({ description: 'Kopiyky (UAH)', example: 1500000 })
  monthlyRent: number;

  @ApiProperty({ description: 'The lease covers today (Kyiv time)' })
  isCurrent: boolean;

  static from(link: TenantWithLeases['leases'][number], today: Date): TenantLeaseResponseDto {
    return {
      leaseId: link.leaseId,
      apartmentId: link.lease.apartmentId,
      apartmentName: link.lease.apartment.name,
      startDate: formatDateOnly(link.lease.startDate),
      endDate: link.lease.endDate ? formatDateOnly(link.lease.endDate) : null,
      role: link.role,
      monthlyRent: link.lease.monthlyRent,
      isCurrent: isLeaseCurrent(link.lease, today),
    };
  }
}
