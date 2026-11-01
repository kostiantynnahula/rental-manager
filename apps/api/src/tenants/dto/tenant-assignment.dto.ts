import { ApiProperty } from '@nestjs/swagger';
import { IsIn } from 'class-validator';

export const TENANT_ASSIGNMENT_MODES = ['NEW_LEASE', 'ADD_CONTACT'] as const;
export type TenantAssignmentMode = (typeof TENANT_ASSIGNMENT_MODES)[number];

// Base of the assignment variants. class-transformer falls back to it for an unknown/missing `mode`,
// so @IsIn rejects such a body (and forbidNonWhitelisted the variant's fields).
export class TenantAssignmentDto {
  @ApiProperty({ enum: TENANT_ASSIGNMENT_MODES })
  @IsIn(TENANT_ASSIGNMENT_MODES)
  mode: TenantAssignmentMode;
}
