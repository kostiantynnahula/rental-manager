import {
  Body,
  Controller,
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
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Scopes } from '../auth/scopes.decorator.js';
import { ApartmentsService } from './apartments.service.js';
import { ApartmentDetailResponseDto } from './dto/apartment-detail-response.dto.js';
import { ApartmentResponseDto } from './dto/apartment-response.dto.js';
import { CreateApartmentDto } from './dto/create-apartment.dto.js';
import { ListApartmentsQueryDto } from './dto/list-apartments-query.dto.js';
import { UpdateApartmentDto } from './dto/update-apartment.dto.js';

// No DELETE: apartments are archived (isActive = false) so lease history stays intact.
@ApiTags('apartments')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments')
export class ApartmentsController {
  constructor(private readonly apartments: ApartmentsService) {}

  @Get()
  // The Telegram bot: apartment names for its summaries and the "choose an apartment" buttons.
  @Scopes('apartments:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: apartments:read' })
  @ApiOkResponse({ type: [ApartmentDetailResponseDto], description: 'Each with its current lease' })
  async list(@Query() query: ListApartmentsQueryDto): Promise<ApartmentDetailResponseDto[]> {
    const apartments = await this.apartments.list(query.active);
    return apartments.map((a) => ApartmentDetailResponseDto.fromWithLease(a, a.leases[0] ?? null));
  }

  @Get(':id')
  @ApiOkResponse({ type: ApartmentDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ApartmentDetailResponseDto> {
    const { apartment, currentLease } = await this.apartments.findWithCurrentLease(id);
    return ApartmentDetailResponseDto.fromWithLease(apartment, currentLease);
  }

  @Post()
  @ApiCreatedResponse({ type: ApartmentResponseDto })
  @ApiBadRequestResponse()
  @ApiConflictResponse({ description: 'Name already exists' })
  async create(@Body() dto: CreateApartmentDto): Promise<ApartmentResponseDto> {
    return ApartmentResponseDto.from(await this.apartments.create(dto));
  }

  @Patch(':id')
  @ApiOkResponse({ type: ApartmentResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({ description: 'Name already exists' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateApartmentDto,
  ): Promise<ApartmentResponseDto> {
    return ApartmentResponseDto.from(await this.apartments.update(id, dto));
  }

  @Post(':id/archive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ApartmentResponseDto })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async archive(@Param('id', ParseUUIDPipe) id: string): Promise<ApartmentResponseDto> {
    return ApartmentResponseDto.from(await this.apartments.setActive(id, false));
  }

  @Post(':id/unarchive')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ApartmentResponseDto })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async unarchive(@Param('id', ParseUUIDPipe) id: string): Promise<ApartmentResponseDto> {
    return ApartmentResponseDto.from(await this.apartments.setActive(id, true));
  }
}
