import { ApiProperty } from '@nestjs/swagger';
import type { ConditionPhotoSearchHit } from '../interfaces/condition-photo-search-hit.interface.js';
import { ConditionPhotoResponseDto } from './condition-photo-response.dto.js';

// A photo of the list's shape + its relevance.
export class ConditionPhotoSearchResultDto extends ConditionPhotoResponseDto {
  @ApiProperty({ example: 0.62, description: '1 − cosine distance; higher = more relevant' })
  score: number;

  static fromHit({ photo, score }: ConditionPhotoSearchHit): ConditionPhotoSearchResultDto {
    return { ...ConditionPhotoResponseDto.from(photo), score };
  }
}
