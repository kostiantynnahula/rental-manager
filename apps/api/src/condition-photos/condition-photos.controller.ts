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
  Patch,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { FILE_CACHE_CONTROL, toStreamableFile } from '../images/helpers/streamable-file.js';
import { ConditionPhotosService } from './condition-photos.service.js';
import { ConditionPhotoDetailResponseDto } from './dto/condition-photo-detail-response.dto.js';
import { UpdateConditionPhotoDto } from './dto/update-condition-photo.dto.js';

@ApiTags('condition-photos')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Condition photo not found' })
@Controller('condition-photos')
export class ConditionPhotosController {
  constructor(private readonly photos: ConditionPhotosService) {}

  @Get(':id')
  @ApiOkResponse({ type: ConditionPhotoDetailResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ConditionPhotoDetailResponseDto> {
    return ConditionPhotoDetailResponseDto.fromDetail(await this.photos.findDetailOrThrow(id));
  }

  @Get(':id/file')
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/jpeg', 'image/png', 'image/webp')
  @ApiOkResponse({ description: 'The original, unchanged' })
  async file(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'original'));
  }

  @Get(':id/thumbnail')
  @Header('Cache-Control', FILE_CACHE_CONTROL)
  @Header('X-Content-Type-Options', 'nosniff')
  @ApiProduces('image/webp')
  @ApiOkResponse({ description: 'WebP, max 400px' })
  async thumbnail(@Param('id', ParseUUIDPipe) id: string): Promise<StreamableFile> {
    return toStreamableFile(await this.photos.openFile(id, 'thumbnail'));
  }

  @Patch(':id')
  @ApiOkResponse({ type: ConditionPhotoDetailResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConditionPhotoDto,
  ): Promise<ConditionPhotoDetailResponseDto> {
    return ConditionPhotoDetailResponseDto.fromDetail(await this.photos.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Row and stored objects deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.photos.delete(id);
  }
}
