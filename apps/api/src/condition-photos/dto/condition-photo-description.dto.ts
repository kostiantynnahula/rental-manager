import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import {
  CONDITION_PHOTO_ROOMS,
  type ConditionPhotoRoom,
  DESCRIPTION_MAX_ITEMS,
  DESCRIPTION_SUMMARY_MAX_LENGTH,
} from '../constants/condition-photo-description.js';
import { ConditionPhotoItemDto } from './condition-photo-item.dto.js';

// The worker's structured description of a condition photo (stored as ConditionPhoto.description). In Ukrainian.
export class ConditionPhotoDescriptionDto {
  @ApiProperty({ enum: CONDITION_PHOTO_ROOMS, enumName: 'ConditionPhotoRoom' })
  @IsIn(CONDITION_PHOTO_ROOMS)
  room: ConditionPhotoRoom;

  @ApiProperty({ type: [ConditionPhotoItemDto], maxItems: DESCRIPTION_MAX_ITEMS })
  @IsArray()
  @ArrayMaxSize(DESCRIPTION_MAX_ITEMS)
  @ValidateNested({ each: true })
  @Type(() => ConditionPhotoItemDto)
  items: ConditionPhotoItemDto[];

  @ApiProperty({ maxLength: DESCRIPTION_SUMMARY_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DESCRIPTION_SUMMARY_MAX_LENGTH)
  summary: string;
}
