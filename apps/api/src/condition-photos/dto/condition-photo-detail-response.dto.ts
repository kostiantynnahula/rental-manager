import { ApiProperty } from '@nestjs/swagger';
import { LeaseResponseDto } from '../../leases/dto/lease-response.dto.js';
import type { ConditionPhotoDetail } from '../interfaces/condition-photo-detail.interface.js';
import { ConditionPhotoResponseDto } from './condition-photo-response.dto.js';

export class ConditionPhotoDetailResponseDto extends ConditionPhotoResponseDto {
  @ApiProperty({
    type: LeaseResponseDto,
    nullable: true,
    description:
      "The apartment's lease covering takenOn (leases never overlap), or null. Derived, never validated",
  })
  lease: LeaseResponseDto | null;

  // Human-only routes, so tenant data is included.
  static fromDetail({ photo, lease }: ConditionPhotoDetail): ConditionPhotoDetailResponseDto {
    return {
      ...ConditionPhotoResponseDto.from(photo),
      lease: lease && LeaseResponseDto.from(lease, { withTenants: true }),
    };
  }
}
