import { OmitType, PartialType } from '@nestjs/swagger';
import { CreateTenantDto } from './create-tenant.dto.js';

// An assignment only exists on create; lease changes go through /leases.
export class UpdateTenantDto extends PartialType(
  OmitType(CreateTenantDto, ['assignment'] as const),
) {}
