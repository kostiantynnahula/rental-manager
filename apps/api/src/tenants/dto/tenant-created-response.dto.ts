import { ApiProperty } from '@nestjs/swagger';
import { Tenant } from '../../generated/prisma/client.js';
import { LeaseResponseDto } from '../../leases/dto/lease-response.dto.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';
import { TenantResponseDto } from './tenant-response.dto.js';

export class TenantCreatedResponseDto extends TenantResponseDto {
  @ApiProperty({
    type: LeaseResponseDto,
    nullable: true,
    description: 'The lease created or joined via `assignment`; null without one',
  })
  lease: LeaseResponseDto | null;

  static fromWithLease(t: Tenant, lease: LeaseWithTenants | null): TenantCreatedResponseDto {
    return { ...TenantResponseDto.from(t), lease: lease ? LeaseResponseDto.from(lease) : null };
  }
}
