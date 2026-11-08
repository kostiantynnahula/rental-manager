import {
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Scopes } from '../auth/scopes.decorator.js';
import { PhotoDetailResponseDto } from './dto/photo-detail-response.dto.js';
import type { PhotoFile } from './interfaces/photo-file.interface.js';
import { PhotosService } from './photos.service.js';

// Files are immutable (a new upload gets a new id), so the browser may cache them for a day.
// private: never in shared caches — they're behind auth.
const FILE_CACHE_CONTROL = 'private, max-age=86400';

@ApiTags('photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Photo not found' })
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Get(':id')
  @ApiOkResponse({ type: PhotoDetailResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PhotoDetailResponseDto> {
    return PhotoDetailResponseDto.fromDetail(await this.photos.findOrThrow(id));
  }

  @Get(':id/file')
  // The worker downloads photos with an API key.
  @Scopes('photos:read')
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'API key without photos:read' })
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The original, unchanged' })
  async file(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'original'));
  }

  @Get(':id/thumbnail')
  // The worker downloads photos with an API key.
  @Scopes('photos:read')
  @ApiBearerAuth()
  @ApiForbiddenResponse({ description: 'API key without photos:read' })
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'WebP, max 400px' })
  async thumbnail(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'thumbnail'));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Row and stored objects deleted' })
  @ApiConflictResponse({ description: 'Linked to a non-cancelled reading' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.photos.delete(id);
  }
}

function toStreamableFile({ body, mimeType, contentLength }: PhotoFile): StreamableFile {
  return new StreamableFile(body, {
    type: mimeType,
    length: contentLength,
    disposition: 'inline',
  });
}
