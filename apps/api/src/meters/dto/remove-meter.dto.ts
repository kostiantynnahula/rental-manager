import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';
import { IsReadingValues } from '../../readings/validators/is-reading-values.decorator.js';

export class RemoveMeterDto {
  @ApiProperty({ format: 'date', example: '2026-10-30', description: 'Not in the future' })
  @IsDateOnly()
  removedAt: string;

  @ApiProperty({ type: [ReadingValueInputDto], description: 'Not lower than the last confirmed' })
  @IsReadingValues()
  finalValues: ReadingValueInputDto[];
}
