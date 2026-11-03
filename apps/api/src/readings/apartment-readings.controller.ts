import { Controller, Get, Param, ParseUUIDPipe, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ApartmentMeterReadingResponseDto } from './dto/apartment-meter-reading-response.dto.js';
import { ApartmentReadingHistoryQueryDto } from './dto/apartment-reading-history-query.dto.js';
import { ApartmentReadingsQueryDto } from './dto/apartment-readings-query.dto.js';
import { ReadingHistoryPageResponseDto } from './dto/reading-history-page-response.dto.js';
import { ReadingsService } from './readings.service.js';

@ApiTags('readings')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/readings')
export class ApartmentReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  // "Who hasn't sent readings yet": every meter active in the period, with or without a reading.
  @Get()
  @ApiOkResponse({ type: [ApartmentMeterReadingResponseDto] })
  @ApiBadRequestResponse({ description: 'Missing or invalid period' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ApartmentReadingsQueryDto,
  ): Promise<ApartmentMeterReadingResponseDto[]> {
    const items = await this.readings.listForApartment(apartmentId, query.period);
    return items.map((i) => ApartmentMeterReadingResponseDto.from(i));
  }

  // Confirmed readings with consumption, paginated by reading (a day/night reading is one item).
  @Get('history')
  @ApiOkResponse({ type: ReadingHistoryPageResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid filters (period format, from after to, page size, meter ids)',
  })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async history(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ApartmentReadingHistoryQueryDto,
  ): Promise<ReadingHistoryPageResponseDto> {
    return ReadingHistoryPageResponseDto.from(
      await this.readings.historyForApartment(apartmentId, query),
    );
  }
}
