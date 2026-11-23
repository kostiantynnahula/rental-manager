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
  Put,
  StreamableFile,
} from '@nestjs/common';
import {
  ApiBadGatewayResponse,
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
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { FILE_CACHE_CONTROL, toStreamableFile } from '../images/helpers/streamable-file.js';
import { ConditionPhotosService } from './condition-photos.service.js';
import { ConditionPhotoDetailResponseDto } from './dto/condition-photo-detail-response.dto.js';
import { SetConditionPhotoDescriptionDto } from './dto/set-condition-photo-description.dto.js';
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

  // Also open to the worker's key (it describes the photo); the detail stays human-only (tenants in the lease).
  @Get(':id/file')
  @Scopes('condition-photos:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: condition-photos:read' })
  @ApiForbiddenResponse({ description: 'API key without condition-photos:read' })
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
  @ApiOkResponse({
    type: ConditionPhotoDetailResponseDto,
    description:
      'Saved even if re-indexing an edited description fails (then indexStatus stays DESCRIBED)',
  })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiConflictResponse({
    description:
      'description: null, but there is no generated description to restore; or the photo changed meanwhile (retry)',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateConditionPhotoDto,
  ): Promise<ConditionPhotoDetailResponseDto> {
    return ConditionPhotoDetailResponseDto.fromDetail(await this.photos.update(id, dto));
  }

  @Put(':id/description')
  // The worker reports its description, or why it failed (API keys only).
  @Scopes('condition-photos:describe')
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'description → DESCRIBED, then embedded → INDEXED; error → FAILED (+ indexNote). Idempotent. API key scope: condition-photos:describe (keys only)',
  })
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'indexStatus, description / indexNote set' })
  @ApiBadRequestResponse({ description: 'Invalid body, or both description and error' })
  @ApiBadGatewayResponse({ description: 'Embedding failed (the description is saved, DESCRIBED)' })
  @ApiServiceUnavailableResponse({ description: 'Embeddings not configured (saved, DESCRIBED)' })
  @ApiForbiddenResponse({
    description: 'Not an API key, or a key without condition-photos:describe',
  })
  async setDescription(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SetConditionPhotoDescriptionDto,
    @CurrentUser() user: AuthUser,
  ): Promise<void> {
    await this.photos.setDescription(id, dto, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Row and stored objects deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.photos.delete(id);
  }
}
