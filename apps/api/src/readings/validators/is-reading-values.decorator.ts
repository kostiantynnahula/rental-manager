import { applyDecorators } from '@nestjs/common';
import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, ValidateNested } from 'class-validator';
import { ReadingValueInputDto } from '../dto/reading-value-input.dto.js';

// Shape of a values payload: [{ zone, value }]. Whether the zones fit the meter's zoneScheme
// needs the meter, so services check that with zonesMismatch() (helpers/zones.ts).
export function IsReadingValues(): PropertyDecorator {
  return applyDecorators(
    IsArray(),
    ArrayMinSize(1),
    ValidateNested({ each: true }),
    Type(() => ReadingValueInputDto),
  );
}
