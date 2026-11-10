import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CreateReadingDto } from './dto/create-reading.dto.js';
import { ListMeterReadingsQueryDto } from './dto/list-meter-readings-query.dto.js';
import { ReadingResponseDto } from './dto/reading-response.dto.js';
import { ReadingsService } from './readings.service.js';

@ApiTags('readings')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Meter not found' })
@Controller('meters/:meterId/readings')
export class MeterReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get()
  @ApiOkResponse({
    type: [ReadingResponseDto],
    description: 'All kinds, newest first, each with consumption since the previous confirmed one',
  })
  @ApiBadRequestResponse({ description: 'Invalid period, or from after to' })
  async list(
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @Query() query: ListMeterReadingsQueryDto,
  ): Promise<ReadingResponseDto[]> {
    const items = await this.readings.listForMeter(meterId, {
      from: query.from,
      to: query.to,
      includeCancelled: query.includeCancelled === 'true',
    });
    return items.map((i) => ReadingResponseDto.from(i));
  }

  @Post()
  // Closed to API keys (no @Scopes): the worker uses POST /meters/:meterId/draft-values.
  @ApiOperation({
    description:
      'A DRAFT may hold a subset of the meter zones; confirm=true needs all of them. Not for API keys: ' +
      'they add values with POST /meters/{meterId}/draft-values',
  })
  @ApiCreatedResponse({
    type: ReadingResponseDto,
    description: 'REGULAR reading, DRAFT unless confirm=true',
  })
  @ApiBadRequestResponse({
    description:
      'Unknown/duplicate zones; photo not found or of another apartment; with confirm: zones missing, ' +
      'date outside window/in future, value out of order',
  })
  @ApiForbiddenResponse({ description: 'API key (closed to keys)' })
  @ApiConflictResponse({ description: 'Meter removed; with confirm: period already confirmed' })
  async create(
    @Param('meterId', ParseUUIDPipe) meterId: string,
    @Body() dto: CreateReadingDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.create(meterId, dto, user.id));
  }
}
