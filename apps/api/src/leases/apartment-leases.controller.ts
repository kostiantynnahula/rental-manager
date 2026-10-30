import { Body, Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CreateLeaseDto } from './dto/create-lease.dto.js';
import { LeaseResponseDto } from './dto/lease-response.dto.js';
import { LeasesService } from './leases.service.js';

// Lease routes nested under an apartment; the rest live in LeasesController (/leases/:id).
@ApiTags('leases')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/leases')
export class ApartmentLeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get()
  @ApiOkResponse({ type: [LeaseResponseDto], description: 'Lease history, newest first' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
  ): Promise<LeaseResponseDto[]> {
    const leases = await this.leases.listForApartment(apartmentId);
    return leases.map((l) => LeaseResponseDto.from(l));
  }

  @Post()
  @ApiCreatedResponse({ type: LeaseResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body, not exactly one PRIMARY, unknown tenant, endDate before startDate',
  })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({ description: 'Apartment is archived, or dates overlap another lease' })
  async create(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Body() dto: CreateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.leases.create(apartmentId, dto));
  }
}
