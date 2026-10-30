import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

export class ListApartmentPhotosQueryDto {
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    default: 'false',
    description: 'true = only photos not linked to any non-cancelled reading',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  unassigned: 'true' | 'false' = 'false';
}
