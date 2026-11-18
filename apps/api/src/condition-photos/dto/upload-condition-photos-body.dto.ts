import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { ConditionPhotoEvent } from '../../generated/prisma/enums.js';
import { CONDITION_PHOTO_NOTE_MAX_LENGTH } from '../helpers/note.js';

// Text fields of the upload (multipart, next to "files"): one event/date/note for the whole request.
export class UploadConditionPhotosBodyDto {
  @ApiProperty({ enum: ConditionPhotoEvent, enumName: 'ConditionPhotoEvent' })
  @IsEnum(ConditionPhotoEvent)
  event: ConditionPhotoEvent;

  @ApiProperty({
    format: 'date',
    example: '2026-11-01',
    description: 'When the photos were taken (set by the user: messengers strip EXIF)',
  })
  @IsDateOnly()
  takenOn: string;

  @ApiPropertyOptional({ maxLength: CONDITION_PHOTO_NOTE_MAX_LENGTH })
  @IsOptional()
  @IsString()
  @MaxLength(CONDITION_PHOTO_NOTE_MAX_LENGTH)
  note?: string;
}
