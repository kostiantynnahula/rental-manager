import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
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
import { Scopes } from '../auth/scopes.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CreateMeterDto } from './dto/create-meter.dto.js';
import { ListMetersQueryDto } from './dto/list-meters-query.dto.js';
import { MeterResponseDto } from './dto/meter-response.dto.js';
import { MetersService } from './meters.service.js';

// Meter routes nested under an apartment; the rest live in MetersController (/meters/:id).
@ApiTags('meters')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Apartment not found' })
@Controller('apartments/:apartmentId/meters')
export class ApartmentMetersController {
  constructor(private readonly meters: MetersService) {}

  @Get()
  // The worker needs the meters (utilities, zones, last values) to read a photo. POST stays closed to keys.
  @Scopes('meters:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: meters:read' })
  @ApiForbiddenResponse({ description: 'API key without meters:read' })
  @ApiOkResponse({
    type: [MeterResponseDto],
    description: 'Each meter with its last confirmed values',
  })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ListMetersQueryDto,
  ): Promise<MeterResponseDto[]> {
    const meters = await this.meters.listForApartment(apartmentId, query.includeRemoved === 'true');
    return (await this.meters.withFlags(meters)).map((m) => MeterResponseDto.from(m));
  }

  @Post()
  @ApiCreatedResponse({ type: MeterResponseDto, description: 'Meter + CONFIRMED INITIAL reading' })
  @ApiBadRequestResponse({ description: "Invalid body, zones don't match zoneScheme, future date" })
  @ApiConflictResponse({ description: 'Apartment is archived' })
  async create(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Body() dto: CreateMeterDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MeterResponseDto> {
    const meter = await this.meters.create(apartmentId, dto, user.id);
    return MeterResponseDto.from(await this.meters.withFlagsOne(meter));
  }
}
