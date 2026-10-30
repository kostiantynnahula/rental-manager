import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { ValidateNested } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';
import { IsReadingValues } from '../../readings/validators/is-reading-values.decorator.js';
import { NewMeterDto } from './new-meter.dto.js';

export class ReplaceMeterDto {
  @ApiProperty({
    format: 'date',
    example: '2026-10-30',
    description: 'Old meter removedAt = new meter installedAt',
  })
  @IsDateOnly()
  date: string;

  @ApiProperty({ type: [ReadingValueInputDto], description: 'Old meter, not lower than its last' })
  @IsReadingValues()
  finalValues: ReadingValueInputDto[];

  @ApiProperty({ type: NewMeterDto })
  @ValidateNested()
  @Type(() => NewMeterDto)
  newMeter: NewMeterDto;
}
