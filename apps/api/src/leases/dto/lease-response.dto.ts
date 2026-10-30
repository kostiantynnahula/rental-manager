import { ApiProperty } from '@nestjs/swagger';
import { formatDateOnly } from '../../common/helpers/date-only.js';
import type { LeaseWithTenants } from '../helpers/lease-with-tenants.js';
import { LeaseTenantResponseDto } from './lease-tenant-response.dto.js';

export class LeaseResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ format: 'date', example: '2026-01-01' })
  startDate: string;

  @ApiProperty({
    type: String,
    format: 'date',
    nullable: true,
    example: null,
    description: 'Inclusive last day; null = open-ended',
  })
  endDate: string | null;

  @ApiProperty({ example: 1500000, description: 'Integer kopiyky (UAH)' })
  monthlyRent: number;

  @ApiProperty({ type: String, nullable: true })
  notes: string | null;

  @ApiProperty({ type: [LeaseTenantResponseDto], description: 'PRIMARY first' })
  tenants: LeaseTenantResponseDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(lease: LeaseWithTenants): LeaseResponseDto {
    return {
      id: lease.id,
      apartmentId: lease.apartmentId,
      startDate: formatDateOnly(lease.startDate),
      endDate: lease.endDate ? formatDateOnly(lease.endDate) : null,
      monthlyRent: lease.monthlyRent,
      notes: lease.notes,
      tenants: lease.tenants.map((t) => LeaseTenantResponseDto.from(t)),
      createdAt: lease.createdAt,
      updatedAt: lease.updatedAt,
    };
  }
}
