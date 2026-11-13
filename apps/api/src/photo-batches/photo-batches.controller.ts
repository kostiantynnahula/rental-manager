import { Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { PhotoBatchConfirmResponseDto } from './dto/photo-batch-confirm-response.dto.js';
import { PhotoBatchResponseDto } from './dto/photo-batch-response.dto.js';
import { PhotoBatchesService } from './photo-batches.service.js';

@ApiTags('photo-batches')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('photo-batches')
export class PhotoBatchesController {
  constructor(private readonly batches: PhotoBatchesService) {}

  @Get(':batchId')
  // The Telegram bot: the summary it answers with once the batch is parsed.
  @Scopes('photos:read', 'readings:read')
  @ApiBearerAuth()
  @ApiOperation({
    description:
      "The batch's photos and the readings taken from them, by apartment, with previous values, consumption, " +
      'warnings, missing zones and canConfirm. API key scopes: photos:read + readings:read',
  })
  @ApiOkResponse({ type: PhotoBatchResponseDto })
  @ApiBadRequestResponse({ description: 'batchId is not a uuid' })
  @ApiForbiddenResponse({ description: 'API key without photos:read and readings:read' })
  @ApiNotFoundResponse({ description: 'No photo has this batchId' })
  async summary(@Param('batchId', ParseUUIDPipe) batchId: string): Promise<PhotoBatchResponseDto> {
    return PhotoBatchResponseDto.from(await this.batches.summary(batchId));
  }

  @Post(':batchId/confirm')
  @HttpCode(HttpStatus.OK)
  // «Підтвердити всі» in the bot. A key confirms only on behalf of a human action (the button, tapped by an
  // allowlisted user) — never the worker.
  @Scopes('readings:confirm')
  @ApiBearerAuth()
  @ApiOperation({
    description:
      'Confirms every reading of the batch that is canConfirm now, each on its own (same rules as ' +
      'POST /readings/:id/confirm; one refusal does not stop the others). API key scope: readings:confirm ' +
      '(only for a human action, e.g. a bot button)',
  })
  @ApiOkResponse({ type: PhotoBatchConfirmResponseDto })
  @ApiBadRequestResponse({ description: 'batchId is not a uuid' })
  @ApiForbiddenResponse({ description: 'API key without readings:confirm' })
  @ApiNotFoundResponse({ description: 'No photo has this batchId' })
  async confirm(
    @Param('batchId', ParseUUIDPipe) batchId: string,
    @CurrentUser() user: AuthUser,
  ): Promise<PhotoBatchConfirmResponseDto> {
    return PhotoBatchConfirmResponseDto.from(await this.batches.confirm(batchId, user.id));
  }
}
