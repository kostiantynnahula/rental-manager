import { ApiProperty } from '@nestjs/swagger';
import type { UploadedPhoto } from '../interfaces/uploaded-photo.interface.js';
import { PhotoResponseDto } from './photo-response.dto.js';

export class PhotoUploadResultDto extends PhotoResponseDto {
  @ApiProperty({
    description: 'true = same file (by SHA-256) was already uploaded; existing record',
  })
  duplicate: boolean;

  static fromUpload({ photo, duplicate }: UploadedPhoto): PhotoUploadResultDto {
    return { ...PhotoResponseDto.from(photo), duplicate };
  }
}
