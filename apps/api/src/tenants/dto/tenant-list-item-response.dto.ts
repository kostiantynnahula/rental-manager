import { ApiProperty } from '@nestjs/swagger';
import type { TenantWithLeaseDates } from '../helpers/tenant-list-include.js';
import {
  isLeaseCurrent,
  TENANT_STATUSES,
  tenantStatus,
  type TenantStatus,
} from '../helpers/tenant-status.js';
import { TenantApartmentResponseDto } from './tenant-apartment-response.dto.js';
import { TenantResponseDto } from './tenant-response.dto.js';

export class TenantListItemResponseDto extends TenantResponseDto {
  @ApiProperty({
    enum: TENANT_STATUSES,
    enumName: 'TenantStatus',
    description:
      'LIVING: a lease covers today (Kyiv). FORMER: only ended leases. NONE: no leases or only future ones.',
  })
  status: TenantStatus;

  @ApiProperty({
    type: TenantApartmentResponseDto,
    nullable: true,
    description: 'Apartment of the lease covering today',
  })
  currentApartment: TenantApartmentResponseDto | null;

  static fromWithLeaseDates(t: TenantWithLeaseDates, today: Date): TenantListItemResponseDto {
    const leases = t.leases.map((l) => l.lease);
    // At most one current lease per tenant in practice; take the first if data ever says otherwise.
    const current = leases.find((l) => isLeaseCurrent(l, today));
    return {
      ...TenantResponseDto.from(t),
      status: tenantStatus(leases, today),
      currentApartment: current ? { id: current.apartment.id, name: current.apartment.name } : null,
    };
  }
}
