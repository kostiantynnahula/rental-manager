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
import { CreateTariffDto } from './dto/create-tariff.dto.js';
import { ListTariffsQueryDto } from './dto/list-tariffs-query.dto.js';
import { TariffDetailResponseDto } from './dto/tariff-detail-response.dto.js';
import { TariffPageResponseDto } from './dto/tariff-page-response.dto.js';
import { TariffPriceInputDto } from './dto/tariff-price-input.dto.js';
import { TariffPriceResponseDto } from './dto/tariff-price-response.dto.js';
import { UpdateTariffPriceDto } from './dto/update-tariff-price.dto.js';
import { UpdateTariffDto } from './dto/update-tariff.dto.js';
import { TariffsService } from './tariffs.service.js';

// Tariff responses carry the prices in effect this month (Kyiv time).
@ApiTags('tariffs')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffs: TariffsService) {}

  @Get()
  @ApiOkResponse({ type: TariffPageResponseDto, description: 'Ordered by name' })
  @ApiBadRequestResponse()
  async list(@Query() query: ListTariffsQueryDto): Promise<TariffPageResponseDto> {
    return TariffPageResponseDto.from(
      await this.tariffs.list(query),
      periodOfDate(todayDateOnly()),
    );
  }

  @Get(':id')
  @ApiOkResponse({ type: TariffDetailResponseDto, description: 'With the full price history' })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TariffDetailResponseDto> {
    const tariff = await this.tariffs.findWithPricesOrThrow(id);
    return TariffDetailResponseDto.fromWithHistory(tariff, periodOfDate(todayDateOnly()));
  }

  @Post()
  @ApiCreatedResponse({ type: TariffDetailResponseDto })
  @ApiBadRequestResponse({
    description:
      "Invalid body: utilities don't fit the kind, DAY/NIGHT price on a non-electricity tariff, duplicate prices, no TOTAL price from the earliest month",
  })
  @ApiConflictResponse({ description: 'Name already exists' })
  async create(@Body() dto: CreateTariffDto): Promise<TariffDetailResponseDto> {
    const tariff = await this.tariffs.create(dto);
    return TariffDetailResponseDto.fromWithHistory(tariff, periodOfDate(todayDateOnly()));
  }

  @Patch(':id')
  @ApiOkResponse({ type: TariffDetailResponseDto })
  @ApiBadRequestResponse({
    description: "Invalid body, or new kind/utilities don't fit the prices",
  })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  @ApiConflictResponse({
    description: 'Name already exists, or kind/utilities change on a tariff attached to apartments',
  })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTariffDto,
  ): Promise<TariffDetailResponseDto> {
    const tariff = await this.tariffs.update(id, dto);
    return TariffDetailResponseDto.fromWithHistory(tariff, periodOfDate(todayDateOnly()));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TariffDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<TariffDetailResponseDto> {
    const tariff = await this.tariffs.setActive(id, false);
    return TariffDetailResponseDto.fromWithHistory(tariff, periodOfDate(todayDateOnly()));
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: TariffDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  async unarchive(@Param('id', ParseUUIDPipe) id: string): Promise<TariffDetailResponseDto> {
    const tariff = await this.tariffs.setActive(id, true);
    return TariffDetailResponseDto.fromWithHistory(tariff, periodOfDate(todayDateOnly()));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Deleted with its prices' })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  @ApiConflictResponse({ description: 'Tariff is attached to apartments (archive it instead)' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tariffs.delete(id);
  }

  @Post(':id/prices')
  @ApiCreatedResponse({
    type: TariffPriceResponseDto,
    description: 'A price change from this month on',
  })
  @ApiBadRequestResponse({
    description:
      'Invalid body, DAY/NIGHT on a non-electricity tariff, or earlier than every TOTAL price',
  })
  @ApiNotFoundResponse({ description: 'Tariff not found' })
  @ApiConflictResponse({
    description: 'Tariff is archived, or a price for this month and zone exists',
  })
  async addPrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: TariffPriceInputDto,
  ): Promise<TariffPriceResponseDto> {
    return TariffPriceResponseDto.from(await this.tariffs.addPrice(id, dto));
  }

  @Patch(':id/prices/:priceId')
  @ApiOkResponse({ type: TariffPriceResponseDto, description: 'Fixes a mistyped price' })
  @ApiBadRequestResponse({ description: 'Invalid body, or DAY/NIGHT on a non-electricity tariff' })
  @ApiNotFoundResponse({ description: 'Tariff or price not found' })
  @ApiConflictResponse({
    description:
      'Tariff is archived, a price for this month and zone exists, or the earliest month would lose its TOTAL price',
  })
  async updatePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
    @Body() dto: UpdateTariffPriceDto,
  ): Promise<TariffPriceResponseDto> {
    return TariffPriceResponseDto.from(await this.tariffs.updatePrice(id, priceId, dto));
  }

  @Delete(':id/prices/:priceId')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Removes a mistaken price' })
  @ApiNotFoundResponse({ description: 'Tariff or price not found' })
  @ApiConflictResponse({ description: 'The earliest month would lose its TOTAL price' })
  async deletePrice(
    @Param('id', ParseUUIDPipe) id: string,
    @Param('priceId', ParseUUIDPipe) priceId: string,
  ): Promise<void> {
    await this.tariffs.deletePrice(id, priceId);
  }
}
