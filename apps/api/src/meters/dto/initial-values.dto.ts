import { ApiProperty } from '@nestjs/swagger';
import { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';
import { IsReadingValues } from '../../readings/validators/is-reading-values.decorator.js';

export class InitialValuesDto {
  @ApiProperty({ type: [ReadingValueInputDto] })
  @IsReadingValues()
  initialValues: ReadingValueInputDto[];
}
