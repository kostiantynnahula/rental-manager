import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ConditionPhotoUpload } from './condition-photo-upload.decorator.js';
import { ConditionPhotosService } from './condition-photos.service.js';
import { ConditionPhotoResponseDto } from './dto/condition-photo-response.dto.js';
import { ConditionPhotoUploadResultDto } from './dto/condition-photo-upload-result.dto.js';
import { ConditionPhotoSearchResultDto } from './dto/condition-photo-search-result.dto.js';
import { ListConditionPhotosQueryDto } from './dto/list-condition-photos-query.dto.js';
import { SearchConditionPhotosQueryDto } from './dto/search-condition-photos-query.dto.js';
import { UploadConditionPhotosBodyDto } from './dto/upload-condition-photos-body.dto.js';

// Condition photo routes nested under an apartment; the rest live in ConditionPhotosController.
@ApiTags('condition-photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/condition-photos')
export class ApartmentConditionPhotosController {
  constructor(private readonly photos: ConditionPhotosService) {}

  @Post()
  @ConditionPhotoUpload()
  @ApiNotFoundResponse({ description: 'Apartment not found or archived' })
  @ApiBadRequestResponse({
    description:
      'No files, too many files, unsupported type (JPEG/PNG/WebP only), invalid event/takenOn/note',
  })
  @ApiConflictResponse({ description: 'The same photo was uploaded for another apartment' })
  async upload(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @UploadedFiles() files: Express.Multer.File[] | undefined,
    @Body() body: UploadConditionPhotosBodyDto,
  ): Promise<ConditionPhotoUploadResultDto[]> {
    const results = await this.photos.upload(apartmentId, files, body);
    return results.map((r) => ConditionPhotoUploadResultDto.fromUpload(r));
  }

  @Get()
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiBadRequestResponse({ description: 'Invalid event or date, from after to' })
  @ApiOkResponse({
    type: [ConditionPhotoResponseDto],
    description: 'By takenOn (newest first), then by upload (newest first)',
  })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ListConditionPhotosQueryDto,
  ): Promise<ConditionPhotoResponseDto[]> {
    const photos = await this.photos.list(apartmentId, query);
    return photos.map((p) => ConditionPhotoResponseDto.from(p));
  }

  // Its own route, not a list param: sorted by relevance, with a score (#125).
  @Get('search')
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiBadRequestResponse({ description: 'No q, invalid event/date/limit, from after to' })
  @ApiBadGatewayResponse({ description: 'The embedding service failed' })
  @ApiServiceUnavailableResponse({ description: 'Semantic search is not configured' })
  @ApiOkResponse({
    type: [ConditionPhotoSearchResultDto],
    description: 'Most relevant first; only INDEXED photos',
  })
  async search(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: SearchConditionPhotosQueryDto,
  ): Promise<ConditionPhotoSearchResultDto[]> {
    const hits = await this.photos.search(apartmentId, query);
    return hits.map((h) => ConditionPhotoSearchResultDto.fromHit(h));
  }
}
