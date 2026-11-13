import { Controller, Get, Param, ParseUUIDPipe } from '@nestjs/common';
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
import { Scopes } from '../auth/scopes.decorator.js';
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
}
