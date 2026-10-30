import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export const APARTMENT_ACTIVE_FILTERS = ['true', 'false', 'all'] as const;
export type ApartmentActiveFilter = (typeof APARTMENT_ACTIVE_FILTERS)[number];

export class ListApartmentsQueryDto {
  @ApiPropertyOptional({ enum: APARTMENT_ACTIVE_FILTERS, default: 'true' })
  @IsOptional()
  @IsIn(APARTMENT_ACTIVE_FILTERS)
  active: ApartmentActiveFilter = 'true';
}
