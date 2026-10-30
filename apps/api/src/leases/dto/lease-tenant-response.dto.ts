import { ApiProperty } from '@nestjs/swagger';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';
import type { LeaseWithTenants } from '../helpers/lease-with-tenants.js';

export class LeaseTenantResponseDto {
  @ApiProperty({ format: 'uuid' })
  tenantId: string;

  @ApiProperty({ example: 'Ivan Petrenko' })
  fullName: string;

  @ApiProperty({ example: '+380501112233' })
  phone: string;

  @ApiProperty({ enum: LeaseTenantRole, enumName: 'LeaseTenantRole' })
  role: LeaseTenantRole;

  static from(link: LeaseWithTenants['tenants'][number]): LeaseTenantResponseDto {
    return {
      tenantId: link.tenantId,
      fullName: link.tenant.fullName,
      phone: link.tenant.phone,
      role: link.role,
    };
  }
}
