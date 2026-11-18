import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { ConditionPhotoEvent } from '../generated/prisma/enums.js';
import { ConditionPhotoUploadResultDto } from './dto/condition-photo-upload-result.dto.js';
import { CONDITION_PHOTO_NOTE_MAX_LENGTH } from './helpers/note.js';

// Multipart "files" + the text fields (validated by the @Body() DTO, UploadConditionPhotosBodyDto) and their Swagger
// docs. Count and size limits come from MulterModule (PHOTO_MAX_FILES, PHOTO_MAX_FILE_SIZE_MB), as for meter photos.
export function ConditionPhotoUpload() {
  return applyDecorators(
    UseInterceptors(FilesInterceptor('files')),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['files', 'event', 'takenOn'],
        properties: {
          files: { type: 'array', items: { type: 'string', format: 'binary' } },
          event: { type: 'string', enum: Object.values(ConditionPhotoEvent) },
          takenOn: { type: 'string', format: 'date', example: '2026-11-01' },
          note: { type: 'string', maxLength: CONDITION_PHOTO_NOTE_MAX_LENGTH },
        },
      },
    }),
    ApiCreatedResponse({
      type: [ConditionPhotoUploadResultDto],
      description:
        'In the order sent. duplicate = already a photo of this apartment (existing record returned)',
    }),
    ApiPayloadTooLargeResponse({ description: 'A file is over the size limit' }),
  );
}
