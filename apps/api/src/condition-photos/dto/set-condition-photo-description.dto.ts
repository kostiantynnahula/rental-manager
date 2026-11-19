import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDefined,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateIf,
  ValidateNested,
} from 'class-validator';
import { DESCRIPTION_ERROR_MAX_LENGTH } from '../constants/condition-photo-description.js';
import { ConditionPhotoDescriptionDto } from './condition-photo-description.dto.js';

// The worker's result for a condition photo: exactly one of `description` (→ DESCRIBED) or `error` (→ FAILED).
// A wrapper, not "the description or { error }" as the body: one class-validator DTO can't validate a union.
// Neither → 400 here (description is then required); both → 400 in the service.
export class SetConditionPhotoDescriptionDto {
  @ApiPropertyOptional({ type: ConditionPhotoDescriptionDto })
  @ValidateIf((dto: SetConditionPhotoDescriptionDto) => dto.error === undefined)
  @IsDefined()
  @ValidateNested()
  @Type(() => ConditionPhotoDescriptionDto)
  description?: ConditionPhotoDescriptionDto;

  @ApiPropertyOptional({
    maxLength: DESCRIPTION_ERROR_MAX_LENGTH,
    description: 'Why the photo could not be described',
  })
  @ValidateIf((dto: SetConditionPhotoDescriptionDto) => dto.error !== undefined)
  @IsString()
  @IsNotEmpty()
  @MaxLength(DESCRIPTION_ERROR_MAX_LENGTH)
  error?: string;
}
