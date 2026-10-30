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
import { CreateTenantDto } from './dto/create-tenant.dto.js';
import { ListTenantsQueryDto } from './dto/list-tenants-query.dto.js';
import { TenantDetailResponseDto } from './dto/tenant-detail-response.dto.js';
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
  @ApiOkResponse({ type: [TenantResponseDto] })
  async list(@Query() query: ListTenantsQueryDto): Promise<TenantResponseDto[]> {
    const tenants = await this.tenants.list(query.search);
    return tenants.map((t) => TenantResponseDto.from(t));
  }

  @Get(':id')
  @ApiOkResponse({ type: TenantDetailResponseDto })
  @ApiNotFoundResponse({ description: 'Tenant not found' })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<TenantDetailResponseDto> {
    return TenantDetailResponseDto.fromWithLeases(await this.tenants.findWithLeasesOrThrow(id));
  }

  @Post()
  @ApiCreatedResponse({ type: TenantResponseDto })
  @ApiBadRequestResponse()
  async create(@Body() dto: CreateTenantDto): Promise<TenantResponseDto> {
    return TenantResponseDto.from(await this.tenants.create(dto));
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
