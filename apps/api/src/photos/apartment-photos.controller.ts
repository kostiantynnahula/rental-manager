import { Controller, Get, Param, ParseUUIDPipe, Post, Query, UploadedFiles } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { ListApartmentPhotosQueryDto } from './dto/list-apartment-photos-query.dto.js';
import { PhotoListItemResponseDto } from './dto/photo-list-item-response.dto.js';
import { PhotoUploadResultDto } from './dto/photo-upload-result.dto.js';
import { PhotoUpload } from './photo-upload.decorator.js';
import { PhotosService } from './photos.service.js';

// Photo routes nested under an apartment; the rest (incl. the inbox) live in PhotosController (/photos).
@ApiTags('photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Apartment not found' })
@Controller('apartments/:apartmentId/photos')
export class ApartmentPhotosController {
  constructor(private readonly photos: PhotosService) {}

  @Post()
  @PhotoUpload()
  @ApiBadRequestResponse({
    description:
      'No files, too many files, unsupported type (JPEG/PNG/WebP only), archived apartment',
  })
  @ApiConflictResponse({
    description: 'The same photo was uploaded for another apartment or is in the inbox',
  })
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
