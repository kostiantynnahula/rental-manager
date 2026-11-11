import { applyDecorators, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBody,
  ApiConsumes,
  ApiCreatedResponse,
  ApiPayloadTooLargeResponse,
} from '@nestjs/swagger';
import { PhotoUploadResultDto } from './dto/photo-upload-result.dto.js';

// Shared by both upload endpoints (apartment and inbox): multipart "files" field and its Swagger docs.
// Count and size limits come from MulterModule (PHOTO_MAX_FILES, PHOTO_MAX_FILE_SIZE_MB).
export function PhotoUpload() {
  return applyDecorators(
    UseInterceptors(FilesInterceptor('files')),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['files'],
        properties: {
          files: { type: 'array', items: { type: 'string', format: 'binary' } },
        },
      },
    }),
    ApiCreatedResponse({
      type: [PhotoUploadResultDto],
      description: 'In the order sent; duplicate = already uploaded (existing record returned)',
    }),
    ApiPayloadTooLargeResponse({ description: 'A file is over the size limit' }),
  );
}
