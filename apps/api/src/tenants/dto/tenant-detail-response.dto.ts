import { ApiProperty } from '@nestjs/swagger';
import type { TenantWithLeases } from '../helpers/tenant-with-leases.js';
import { TenantLeaseResponseDto } from './tenant-lease-response.dto.js';
import { TenantResponseDto } from './tenant-response.dto.js';

export class TenantDetailResponseDto extends TenantResponseDto {
  @ApiProperty({ type: [TenantLeaseResponseDto], description: 'Newest first' })
  leases: TenantLeaseResponseDto[];

  static fromWithLeases(t: TenantWithLeases): TenantDetailResponseDto {
    return {
      ...TenantResponseDto.from(t),
      leases: t.leases.map((l) => TenantLeaseResponseDto.from(l)),
    };
  }
}
