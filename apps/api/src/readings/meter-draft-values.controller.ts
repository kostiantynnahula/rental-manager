import { Body, Controller, HttpStatus, Param, ParseUUIDPipe, Post, Res } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { DraftValuesService } from './draft-values.service.js';
import { CreateDraftValueDto } from './dto/create-draft-value.dto.js';
import { ReadingResponseDto } from './dto/reading-response.dto.js';

// API keys only (the worker): one zone's value from one photo, merged into the key user's open draft.
@ApiTags('readings')
@ApiBearerAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Meter not found' })
@Controller('meters/:meterId/draft-values')
export class MeterDraftValuesController {
  constructor(private readonly draftValues: DraftValuesService) {}

  @Post()
  @Scopes('readings:create-draft')
  @ApiOperation({
    description:
      "API key scope: readings:create-draft (keys only). Adds the zone to the key user's open DRAFT of the meter " +
      'and period (never a human draft), or creates one. An existing draft keeps its readingDate; note is appended. ' +
      'Same zone from the same photo → 200, no change (job retry). ' +
      "An inbox photo (no apartment) gets the meter's apartment.",
  })
  @ApiCreatedResponse({ type: ReadingResponseDto, description: 'New DRAFT with this zone' })
  @ApiOkResponse({
    type: ReadingResponseDto,
    description: 'Zone added to the open draft, or already there from this photo (no change)',
  })
  @ApiBadRequestResponse({
    description: "Zone not in the meter's scheme; photo not found or of another apartment",
  })
  @ApiForbiddenResponse({ description: 'Not an API key, or a key without readings:create-draft' })
  @ApiConflictResponse({
    description:
      'Meter removed; apartment archived; zone already filled from another photo (body has readingId)',
  })
  async add(
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @Body() dto: CreateDraftValueDto,
    @CurrentUser() user: AuthUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<ReadingResponseDto> {
    const { entry, created } = await this.draftValues.add(meterId, dto, user);
    res.status(created ? HttpStatus.CREATED : HttpStatus.OK);
    return ReadingResponseDto.from(entry);
  }
}
