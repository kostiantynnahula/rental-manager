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
// replyTo: the endpoint also takes the text field (validated by its @Body() DTO, UploadPhotosBodyDto).
export function PhotoUpload({ replyTo = false }: { replyTo?: boolean } = {}) {
  return applyDecorators(
    UseInterceptors(FilesInterceptor('files')),
    ApiConsumes('multipart/form-data'),
    ApiBody({
      schema: {
        type: 'object',
        required: ['files'],
        properties: {
          files: { type: 'array', items: { type: 'string', format: 'binary' } },
          ...(replyTo && {
            replyTo: {
              type: 'string',
              maxLength: 128,
              description:
                'Opaque: where the answer to this batch goes (the bot: chatId:messageId)',
            },
          }),
        },
      },
    }),
    ApiCreatedResponse({
      type: [PhotoUploadResultDto],
      description:
        'In the order sent; the newly stored photos share one batchId. duplicate = already uploaded ' +
        '(existing record returned, with its own batchId)',
    }),
    ApiPayloadTooLargeResponse({ description: 'A file is over the size limit' }),
  );
}
