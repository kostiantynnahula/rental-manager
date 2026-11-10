import { ApiProperty } from '@nestjs/swagger';
import { photoReadings } from '../helpers/photo-readings.js';
import type { PhotoWithReadings } from '../helpers/photo-with-readings.js';
import { PhotoReadingResponseDto } from './photo-reading-response.dto.js';
import { PhotoResponseDto } from './photo-response.dto.js';

export class PhotoDetailResponseDto extends PhotoResponseDto {
  @ApiProperty({
    type: [PhotoReadingResponseDto],
    description: 'All readings with a value from this photo, incl. cancelled',
  })
  readings: PhotoReadingResponseDto[];

  static fromDetail(p: PhotoWithReadings): PhotoDetailResponseDto {
    return {
      ...PhotoResponseDto.from(p),
      readings: photoReadings(p).map((r) => PhotoReadingResponseDto.from(r)),
    };
  }
}
