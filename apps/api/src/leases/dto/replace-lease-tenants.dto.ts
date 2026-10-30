import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ExactlyOnePrimary } from '../validators/exactly-one-primary.validator.js';
import { UniqueTenantIds } from '../validators/unique-tenant-ids.validator.js';
import { LeaseTenantInputDto } from './lease-tenant-input.dto.js';

// Also the base of CreateLeaseDto: both endpoints share the same tenant rules.
export class ReplaceLeaseTenantsDto {
  @ApiProperty({
    type: [LeaseTenantInputDto],
    description: 'Exactly one PRIMARY; any number of CONTACTs; no duplicates',
  })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => LeaseTenantInputDto)
  @ExactlyOnePrimary()
  @UniqueTenantIds()
  tenants: LeaseTenantInputDto[];
}
