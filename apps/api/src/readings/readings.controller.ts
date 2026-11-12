import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { CancelReadingDto } from './dto/cancel-reading.dto.js';
import { ReadingResponseDto } from './dto/reading-response.dto.js';
import { UpdateReadingDto } from './dto/update-reading.dto.js';
import { ReadingsService } from './readings.service.js';

@ApiTags('readings')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Reading not found' })
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get(':id')
  @Scopes('readings:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: readings:read' })
  @ApiOkResponse({ type: ReadingResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.findOrThrow(id));
  }

  @Patch(':id')
  @ApiOkResponse({ type: ReadingResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body, unknown/duplicate zones, photo not found or of another apartment',
  })
  @ApiConflictResponse({ description: 'Not a DRAFT' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReadingDto,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.update(id, dto));
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  // A key confirms only on behalf of a human action (the Telegram bot's button, tapped by an allowlisted user).
  @Scopes('readings:confirm')
  @ApiBearerAuth()
  @ApiOperation({
    description: 'API key scope: readings:confirm (only for a human action, e.g. a bot button)',
  })
  @ApiOkResponse({ type: ReadingResponseDto })
  @ApiBadRequestResponse({
    description:
      'Zones missing (incomplete draft), date outside window/in future, value out of order',
  })
  @ApiConflictResponse({ description: 'Not a DRAFT, meter removed, or period already confirmed' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.confirm(id, user.id));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @Scopes('readings:cancel')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: readings:cancel (DRAFT only with a key)' })
  @ApiOkResponse({ type: ReadingResponseDto, description: 'Reason is appended to the note' })
  @ApiConflictResponse({
    description: 'INITIAL/FINAL reading, already cancelled, or (API key) not a DRAFT',
  })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReadingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReadingResponseDto> {
    // A key may only drop a draft: cancelling a CONFIRMED reading changes statements — a human does that in the web.
    const draftOnly = user.apiKeyId !== undefined;
    return ReadingResponseDto.from(await this.readings.cancel(id, dto.reason, { draftOnly }));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Not a DRAFT' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.readings.delete(id);
  }
}
