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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { todayDateOnly } from '../common/helpers/date-only.js';
import { periodOfDate } from '../common/helpers/period.js';
import { ApartmentTariffsService } from './apartment-tariffs.service.js';
import { ApartmentTariffResponseDto } from './dto/apartment-tariff-response.dto.js';
import { CreateApartmentTariffDto } from './dto/create-apartment-tariff.dto.js';
import { ListApartmentTariffsQueryDto } from './dto/list-apartment-tariffs-query.dto.js';
import { OverrideApartmentTariffDto } from './dto/override-apartment-tariff.dto.js';
import { UpdateApartmentTariffDto } from './dto/update-apartment-tariff.dto.js';

// "This month" (Kyiv time) decides which attachments are current and which prices are shown.
@ApiTags('tariffs')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/tariffs')
export class ApartmentTariffsController {
  constructor(private readonly attachments: ApartmentTariffsService) {}

  @Get()
  @ApiOkResponse({
    type: [ApartmentTariffResponseDto],
    description: 'Ordered by tariff name, then newest attachment first',
  })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ListApartmentTariffsQueryDto,
  ): Promise<ApartmentTariffResponseDto[]> {
    const period = periodOfDate(todayDateOnly());
    const rows = await this.attachments.list(apartmentId, query.scope, period);
    return rows.map((a) => ApartmentTariffResponseDto.fromWithTariff(a, period));
  }

  @Post()
  @ApiCreatedResponse({ type: ApartmentTariffResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or unknown tariffId' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({
    description:
      'Apartment or tariff is archived, or the tariff is already attached for these months',
  })
  async create(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Body() dto: CreateApartmentTariffDto,
  ): Promise<ApartmentTariffResponseDto> {
    const attachment = await this.attachments.create(apartmentId, dto);
    return ApartmentTariffResponseDto.fromWithTariff(attachment, periodOfDate(todayDateOnly()));
  }

  @Patch(':id')
  @ApiOkResponse({
    type: ApartmentTariffResponseDto,
    description: 'Ended (activeTo) or reopened (null)',
  })
  @ApiBadRequestResponse({ description: 'Invalid body or activeTo before activeFrom' })
  @ApiNotFoundResponse({ description: 'Tariff attachment not found' })
  @ApiConflictResponse({ description: 'Reopening overlaps a later attachment of the same tariff' })
  async update(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApartmentTariffDto,
  ): Promise<ApartmentTariffResponseDto> {
    const attachment = await this.attachments.update(apartmentId, id, dto);
    return ApartmentTariffResponseDto.fromWithTariff(attachment, periodOfDate(todayDateOnly()));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'A mistaken attachment removed' })
  @ApiNotFoundResponse({ description: 'Tariff attachment not found' })
  async delete(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.attachments.delete(apartmentId, id);
  }

  @Post(':id/override')
  @ApiCreatedResponse({
    type: ApartmentTariffResponseDto,
    description:
      "The new attachment of the apartment's own copy (from effectiveFrom); the shared one ends the month before",
  })
  @ApiBadRequestResponse({
    description:
      'Invalid body, effectiveFrom outside the attachment, DAY/NIGHT on a non-electricity tariff, no TOTAL price',
  })
  @ApiNotFoundResponse({ description: 'Apartment or tariff attachment not found' })
  @ApiConflictResponse({ description: 'Apartment is archived, or the name already exists' })
  async override(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: OverrideApartmentTariffDto,
  ): Promise<ApartmentTariffResponseDto> {
    const attachment = await this.attachments.override(apartmentId, id, dto);
    return ApartmentTariffResponseDto.fromWithTariff(attachment, periodOfDate(todayDateOnly()));
  }
}
