import { ApiProperty } from '@nestjs/swagger';
import type { UploadedConditionPhoto } from '../interfaces/uploaded-condition-photo.interface.js';
import { ConditionPhotoResponseDto } from './condition-photo-response.dto.js';

export class ConditionPhotoUploadResultDto extends ConditionPhotoResponseDto {
  @ApiProperty({
    description:
      'true = the same file (by SHA-256) is already a photo of this apartment; existing record, its own ' +
      'event/takenOn/note kept',
  })
  duplicate: boolean;

  static fromUpload({ photo, duplicate }: UploadedConditionPhoto): ConditionPhotoUploadResultDto {
    return { ...ConditionPhotoResponseDto.from(photo), duplicate };
  }
}
