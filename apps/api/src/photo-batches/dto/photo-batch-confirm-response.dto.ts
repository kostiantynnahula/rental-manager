import { ApiProperty } from '@nestjs/swagger';
import type { BatchConfirmResult } from '../interfaces/batch-confirm-result.interface.js';
import { PhotoBatchRefusalResponseDto } from './photo-batch-refusal-response.dto.js';

export class PhotoBatchConfirmResponseDto {
  @ApiProperty({ type: [String], format: 'uuid', description: 'Readings confirmed now' })
  confirmed: string[];

  @ApiProperty({
    type: [PhotoBatchRefusalResponseDto],
    description:
      'canConfirm readings the confirm rules refused. Not confirmable ones (partial, not a DRAFT) are in neither list',
  })
  refused: PhotoBatchRefusalResponseDto[];

  static from(r: BatchConfirmResult): PhotoBatchConfirmResponseDto {
    return {
      confirmed: r.confirmed,
      refused: r.refused.map((x) => PhotoBatchRefusalResponseDto.from(x)),
    };
  }
}
