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
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { TenantCreatedResponseDto } from './dto/tenant-created-response.dto.js';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto.js';
import { TenantDetailResponseDto } from './dto/tenant-detail-response.dto.js';
import { TenantListItemResponseDto } from './dto/tenant-list-item-response.dto.js';
import { TenantResponseDto } from './dto/tenant-response.dto.js';
import { UpdateTenantDto } from './dto/update-tenant.dto.js';
import { TenantsService } from './tenants.service.js';

@ApiTags('tenants')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('tenants')
export class TenantsController {
  constructor(private readonly tenants: TenantsService) {}

  @Get()
  @ApiOkResponse({
    type: [TenantListItemResponseDto],
    description: 'With status and current apartment',
  })
  @ApiBadRequestResponse()
  async list(@Query() query: ListTenantsQueryDto): Promise<TenantListItemResponseDto[]> {
    const tenants = await this.tenants.list(query.search);
    const today = todayDateOnly();
    return tenants.map((t) => TenantListItemResponseDto.fromWithLeaseDates(t, today));
  }

  @Get(':id')
  @ApiOkResponse({ type: TenantDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TenantDetailResponseDto> {
    const tenant = await this.tenants.findWithLeasesOrThrow(id);
    return TenantDetailResponseDto.fromWithLeases(tenant, todayDateOnly());
  }

  @Post()
  @ApiCreatedResponse({ type: TenantCreatedResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid body, unknown apartment or lease in `assignment`',
  })
  @ApiConflictResponse({
    description:
      'Assignment: apartment is archived, lease is not current (ADD_CONTACT), or dates overlap another lease (NEW_LEASE)',
  })
  async create(@Body() dto: CreateTenantDto): Promise<TenantCreatedResponseDto> {
    const { tenant, lease } = await this.tenants.create(dto);
    return TenantCreatedResponseDto.fromWithLease(tenant, lease);
  }

  @Patch(':id')
  @ApiOkResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse()
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTenantDto,
  ): Promise<TenantResponseDto> {
    return TenantResponseDto.from(await this.tenants.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  @ApiConflictResponse({ description: 'Tenant has leases' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.tenants.delete(id);
  }
}
