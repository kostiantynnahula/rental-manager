import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
  StreamableFile,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { ListPhotosQueryDto } from './dto/list-photos-query.dto.js';
import { PhotoDetailResponseDto } from './dto/photo-detail-response.dto.js';
import { PhotoListItemResponseDto } from './dto/photo-list-item-response.dto.js';
import { PhotoUploadResultDto } from './dto/photo-upload-result.dto.js';
import { SetParseResultDto } from './dto/set-parse-result.dto.js';
import type { PhotoFile } from './interfaces/photo-file.interface.js';
import { PhotoUpload } from './photo-upload.decorator.js';
import { PhotosService } from './photos.service.js';

// Files are immutable (a new upload gets a new id), so the browser may cache them for a day.
// private: never in shared caches — they're behind auth.
const FILE_CACHE_CONTROL = 'private, max-age=86400';

@ApiTags('photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('photos')
export class PhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  @PhotoUpload()
  @ApiOperation({ description: 'Upload to the inbox (no apartment yet)' })
  @ApiBadRequestResponse({
    description: 'No files, too many files, unsupported type (JPEG/PNG/WebP only)',
  })
  async upload(
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoUploadResultDto[]> {
    const results = await this.photos.upload(null, files, user.id);
    return results.map((r) => PhotoUploadResultDto.fromUpload(r));
  }

  @Get()
  @ApiOkResponse({ type: [PhotoListItemResponseDto], description: 'Newest first' })
  @ApiBadRequestResponse({ description: 'inbox=true missing' })
  async list(@Query() _query: ListPhotosQueryDto): Promise<PhotoListItemResponseDto[]> {
    const photos = await this.photos.listInbox();
    return photos.map((p) => PhotoListItemResponseDto.fromListItem(p));
  }

  @Get(':id')
  @ApiNotFoundResponse({ description: 'Photo not found' })
  // The worker reads the metadata (apartmentId, linked readings) with an API key.
  @Scopes('photos:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: photos:read' })
  @ApiForbiddenResponse({ description: 'API key without photos:read' })
  @ApiOkResponse({ type: PhotoDetailResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<PhotoDetailResponseDto> {
    return PhotoDetailResponseDto.fromDetail(await this.photos.findOrThrow(id));
  }

  @Get(':id/file')
  @ApiNotFoundResponse({ description: 'Photo not found' })
  // The worker downloads photos with an API key.
  @Scopes('photos:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: photos:read' })
  @ApiForbiddenResponse({ description: 'API key without photos:read' })
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The original, unchanged' })
  async file(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'original'));
  }

  @Get(':id/thumbnail')
  @ApiNotFoundResponse({ description: 'Photo not found' })
  // The worker downloads photos with an API key.
  @Scopes('photos:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: photos:read' })
  @ApiForbiddenResponse({ description: 'API key without photos:read' })
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'WebP, max 400px' })
  async thumbnail(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'thumbnail'));
  }

  @Put(':id/parse-result')
  @ApiNotFoundResponse({ description: 'Photo not found' })
  // The worker reports how its parse job ended (API keys only).
  @Scopes('photos:parse-result')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: photos:parse-result (keys only)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'parseStatus and parseNote set' })
  @ApiBadRequestResponse()
  @ApiForbiddenResponse({ description: 'Not an API key, or a key without photos:parse-result' })
  async setParseResult(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetParseResultDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.photos.setParseResult(id, dto, user);
  }

  @Delete(':id')
  @ApiNotFoundResponse({ description: 'Photo not found' })
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
