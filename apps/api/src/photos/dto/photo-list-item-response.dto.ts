import { ApiProperty } from '@nestjs/swagger';
import type { PhotoWithUsage } from '../helpers/photo-with-usage.js';
import { PhotoResponseDto } from './photo-response.dto.js';

export class PhotoListItemResponseDto extends PhotoResponseDto {
  @ApiProperty({
    description:
      'Computed by the server: DELETE would succeed (not linked to a non-cancelled reading)',
  })
  canDelete: boolean;

  static fromListItem(p: PhotoWithUsage): PhotoListItemResponseDto {
    return { ...PhotoResponseDto.from(p), canDelete: p._count.readings === 0 };
  }
}
