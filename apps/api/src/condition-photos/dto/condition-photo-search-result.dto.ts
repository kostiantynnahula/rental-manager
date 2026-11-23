import { ApiProperty } from '@nestjs/swagger';
import { RERANK_MIN_SCORE } from '../constants/condition-photo-search.js';
import type { ConditionPhotoSearchHit } from '../interfaces/condition-photo-search-hit.interface.js';
import { ConditionPhotoResponseDto } from './condition-photo-response.dto.js';

// A photo of the list's shape + its relevance.
export class ConditionPhotoSearchResultDto extends ConditionPhotoResponseDto {
  @ApiProperty({
    example: 0.62,
    description: `Rerank relevance 0..1, higher = more relevant; always ≥ ${RERANK_MIN_SCORE} (the threshold)`,
  })
  score: number;

  static fromHit({ photo, score }: ConditionPhotoSearchHit): ConditionPhotoSearchResultDto {
    return { ...ConditionPhotoResponseDto.from(photo), score };
  }
}
