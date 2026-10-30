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
  Put,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { EndLeaseDto } from './dto/end-lease.dto.js';
import { LeaseResponseDto } from './dto/lease-response.dto.js';
import { ReplaceLeaseTenantsDto } from './dto/replace-lease-tenants.dto.js';
import { UpdateLeaseDto } from './dto/update-lease.dto.js';
import { LeasesService } from './leases.service.js';

@ApiTags('leases')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Lease not found' })
@Controller('leases')
export class LeasesController {
  constructor(private readonly leases: LeasesService) {}

  @Get(':id')
  @ApiOkResponse({ type: LeaseResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.leases.findOrThrow(id));
  }

  @Patch(':id')
  @ApiOkResponse({ type: LeaseResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body or endDate before startDate' })
  @ApiConflictResponse({ description: 'Dates overlap another lease' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLeaseDto,
  ): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.leases.update(id, dto));
  }

  @Put(':id/tenants')
  @ApiOkResponse({ type: LeaseResponseDto, description: 'Replaces the whole tenant list' })
  @ApiBadRequestResponse({ description: 'Not exactly one PRIMARY, duplicates or unknown tenant' })
  async replaceTenants(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceLeaseTenantsDto,
  ): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.leases.replaceTenants(id, dto.tenants));
  }

  @Post(':id/end')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LeaseResponseDto })
  @ApiBadRequestResponse({ description: 'endDate before startDate' })
  @ApiConflictResponse({ description: 'Lease already ended' })
  async end(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: EndLeaseDto,
  ): Promise<LeaseResponseDto> {
    return LeaseResponseDto.from(await this.leases.end(id, dto.endDate));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.leases.delete(id);
  }
}
