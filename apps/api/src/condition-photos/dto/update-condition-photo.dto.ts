import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength, ValidateIf } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import { CONDITION_PHOTO_NOTE_MAX_LENGTH } from '../helpers/note.js';

// Omitted field = unchanged; note: null = clear. event/takenOn can't be null (ValidateIf, not IsOptional,
// which would let null through).
export class UpdateConditionPhotoDto {
  @ApiPropertyOptional({ enum: ConditionPhotoEvent, enumName: 'ConditionPhotoEvent' })
  @ValidateIf((_, value) => value !== undefined)
  @IsEnum(ConditionPhotoEvent)
  event?: ConditionPhotoEvent;

  @ApiPropertyOptional({ format: 'date', example: '2026-11-01' })
  @ValidateIf((_, value) => value !== undefined)
  @IsDateOnly()
  takenOn?: string;

  @ApiPropertyOptional({ type: String, nullable: true, maxLength: CONDITION_PHOTO_NOTE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CONDITION_PHOTO_NOTE_MAX_LENGTH)
  note?: string | null;
}
