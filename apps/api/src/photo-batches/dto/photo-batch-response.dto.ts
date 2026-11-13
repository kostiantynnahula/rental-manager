import { ApiProperty } from '@nestjs/swagger';
import type { BatchSummary } from '../interfaces/batch-summary.interface.js';
import { PhotoBatchApartmentResponseDto } from './photo-batch-apartment-response.dto.js';
import { PhotoBatchPhotoResponseDto } from './photo-batch-photo-response.dto.js';

// The parse results of a batch, computed by the API: the client (the Telegram bot) only renders it.
export class PhotoBatchResponseDto {
  @ApiProperty({ format: 'uuid' })
  batchId: string;

  @ApiProperty({ type: [PhotoBatchPhotoResponseDto], description: 'In upload order' })
  photos: PhotoBatchPhotoResponseDto[];

  @ApiProperty({
    type: [PhotoBatchApartmentResponseDto],
    description:
      "The readings taken from the photos, by the meter's apartment (by name); empty = nothing matched",
  })
  apartments: PhotoBatchApartmentResponseDto[];

  static from(s: BatchSummary): PhotoBatchResponseDto {
    return {
      batchId: s.batchId,
      photos: s.photos.map((p) => PhotoBatchPhotoResponseDto.from(p)),
      apartments: s.apartments.map((a) => PhotoBatchApartmentResponseDto.from(a)),
    };
  }
}
