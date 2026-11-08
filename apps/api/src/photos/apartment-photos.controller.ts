import {
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
  UseInterceptors,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiConflictResponse,
  ApiConsumes,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiPayloadTooLargeResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { ListApartmentPhotosQueryDto } from './dto/list-apartment-photos-query.dto.js';
import { PhotoListItemResponseDto } from './dto/photo-list-item-response.dto.js';
import { PhotoUploadResultDto } from './dto/photo-upload-result.dto.js';
import { PhotosService } from './photos.service.js';

// Photo routes nested under an apartment; the rest live in PhotosController (/photos/:id).
@ApiTags('photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Apartment not found' })
@Controller('apartments/:apartmentId/photos')
export class ApartmentPhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  // Count and size limits come from MulterModule (PHOTO_MAX_FILES, PHOTO_MAX_FILE_SIZE_MB).
  @UseInterceptors(FilesInterceptor('files'))
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['files'],
      properties: {
        files: { type: 'array', items: { type: 'string', format: 'binary' } },
      },
    },
  })
  @ApiCreatedResponse({
    type: [PhotoUploadResultDto],
    description: 'In the order sent; duplicate = already uploaded (existing record returned)',
  })
  @ApiBadRequestResponse({
    description:
      'No files, too many files, unsupported type (JPEG/PNG/WebP only), archived apartment',
  })
  @ApiPayloadTooLargeResponse({ description: 'A file is over the size limit' })
  @ApiConflictResponse({ description: 'The same photo was uploaded for another apartment' })
  async upload(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoUploadResultDto[]> {
    const results = await this.photos.upload(apartmentId, files, user.id);
    return results.map((r) => PhotoUploadResultDto.fromUpload(r));
  }

  @Get()
  @ApiOkResponse({ type: [PhotoListItemResponseDto], description: 'Newest first' })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ListApartmentPhotosQueryDto,
  ): Promise<PhotoListItemResponseDto[]> {
    const photos = await this.photos.list(apartmentId, query.unassigned === 'true');
    return photos.map((p) => PhotoListItemResponseDto.fromListItem(p));
  }
}
