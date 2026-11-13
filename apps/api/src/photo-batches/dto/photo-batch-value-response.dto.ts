import { ApiProperty } from '@nestjs/swagger';
import { Zone } from '../../generated/prisma/enums.js';
import type { BatchSummaryValue } from '../interfaces/batch-summary-value.interface.js';
import { PhotoBatchWarningResponseDto } from './photo-batch-warning-response.dto.js';

export class PhotoBatchValueResponseDto {
  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string with 3 decimals' })
  value: string;

  @ApiProperty({
    type: String,
    format: 'uuid',
    nullable: true,
    description: 'Photo the value was read from',
  })
  photoId: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '1400.350',
    description: 'Previous CONFIRMED value of the meter and zone; null if there is none',
  })
  previousValue: string | null;

  @ApiProperty({
    type: String,
    nullable: true,
    example: '120.000',
    description:
      'value − previousValue; null without a previous value; negative = lowerThanPrevious',
  })
  consumption: string | null;

  @ApiProperty({ description: 'Lower than the previous value: the reading cannot be confirmed' })
  lowerThanPrevious: boolean;

  @ApiProperty({
    type: [PhotoBatchWarningResponseDto],
    description: 'Shared consumption rule (as the readings history); never blocks. Empty = fine',
  })
  warnings: PhotoBatchWarningResponseDto[];

  static from(v: BatchSummaryValue): PhotoBatchValueResponseDto {
    return {
      zone: v.zone,
      value: v.value.toFixed(3),
      photoId: v.photoId,
      previousValue: v.previousValue?.toFixed(3) ?? null,
      consumption: v.consumption?.toFixed(3) ?? null,
      lowerThanPrevious: v.lowerThanPrevious,
      warnings: v.warnings.map((w) => PhotoBatchWarningResponseDto.from(w)),
    };
  }
}
