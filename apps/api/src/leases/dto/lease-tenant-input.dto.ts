import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsUUID } from 'class-validator';
import { LeaseTenantRole } from '../../generated/prisma/enums.js';

export class LeaseTenantInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tenantId: string;

  @ApiProperty({ enum: LeaseTenantRole, enumName: 'LeaseTenantRole' })
  @IsEnum(LeaseTenantRole)
  role: LeaseTenantRole;
}
