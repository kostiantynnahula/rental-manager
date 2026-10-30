import { ApiProperty } from '@nestjs/swagger';
import { Apartment } from '../../generated/prisma/client.js';
import { LeaseResponseDto } from '../../leases/dto/lease-response.dto.js';
import type { LeaseWithTenants } from '../../leases/helpers/lease-with-tenants.js';
import { ApartmentResponseDto } from './apartment-response.dto.js';

export class ApartmentDetailResponseDto extends ApartmentResponseDto {
  @ApiProperty({
    type: () => LeaseResponseDto,
    nullable: true,
    description: 'Lease covering today (Kyiv time), if any',
  })
  currentLease: LeaseResponseDto | null;

  static fromWithLease(
    a: Apartment,
    currentLease: LeaseWithTenants | null,
  ): ApartmentDetailResponseDto {
    return {
      ...ApartmentResponseDto.from(a),
      currentLease: currentLease ? LeaseResponseDto.from(currentLease) : null,
    };
  }
}
