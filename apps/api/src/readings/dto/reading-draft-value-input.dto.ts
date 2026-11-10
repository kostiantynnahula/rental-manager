import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsUUID } from 'class-validator';
import { ReadingValueInputDto } from './reading-value-input.dto.js';

// A REGULAR reading's value: may come from a photo (one photo shows one register, so each value has its own).
export class ReadingDraftValueInputDto extends ReadingValueInputDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Photo of this apartment the value was read from → source PHOTO, else MANUAL',
  })
  @IsOptional()
  @IsUUID()
  photoId?: string;
}
