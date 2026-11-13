import { ApiProperty } from '@nestjs/swagger';
import type { BatchSummaryApartment } from '../interfaces/batch-summary-apartment.interface.js';
import { PhotoBatchReadingResponseDto } from './photo-batch-reading-response.dto.js';

export class PhotoBatchApartmentResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ example: 'Shevchenka 12/5' })
  name: string;

  @ApiProperty({ description: 'false = archived' })
  isActive: boolean;

  @ApiProperty({
    type: [PhotoBatchReadingResponseDto],
    description: 'By utility, label, period; each reading once',
  })
  readings: PhotoBatchReadingResponseDto[];

  static from({ apartment, readings }: BatchSummaryApartment): PhotoBatchApartmentResponseDto {
    return {
      id: apartment.id,
      name: apartment.name,
      isActive: apartment.isActive,
      readings: readings.map((r) => PhotoBatchReadingResponseDto.from(r)),
    };
  }
}
