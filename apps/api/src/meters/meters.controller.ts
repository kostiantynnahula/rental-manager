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
  Query,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { Scopes } from '../auth/scopes.decorator.js';
import { InitialValuesDto } from './dto/initial-values.dto.js';
import { ListActiveMetersQueryDto } from './dto/list-active-meters-query.dto.js';
import { MeterResponseDto } from './dto/meter-response.dto.js';
import { RemoveMeterDto } from './dto/remove-meter.dto.js';
import { ReplaceMeterResponseDto } from './dto/replace-meter-response.dto.js';
import { ReplaceMeterDto } from './dto/replace-meter.dto.js';
import { UpdateMeterDto } from './dto/update-meter.dto.js';
import { MetersService } from './meters.service.js';

@ApiTags('meters')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Meter not found' })
@Controller('meters')
export class MetersController {
  constructor(private readonly meters: MetersService) {}

  @Get()
  // The worker matches inbox photos (no apartment yet) against every active meter by serial.
  @Scopes('meters:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: meters:read' })
  @ApiForbiddenResponse({ description: 'API key without meters:read' })
  @ApiBadRequestResponse({ description: 'active=true missing' })
  @ApiOkResponse({
    type: [MeterResponseDto],
    description: 'Active meters of active apartments, each with its last confirmed values',
  })
  async listActive(@Query() _query: ListActiveMetersQueryDto): Promise<MeterResponseDto[]> {
    const meters = await this.meters.listActive();
    return (await this.meters.withFlags(meters)).map((m) => MeterResponseDto.from(m));
  }

  @Get(':id')
  @ApiOkResponse({ type: MeterResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<MeterResponseDto> {
    return MeterResponseDto.from(await this.meters.withFlagsOne(await this.meters.findOrThrow(id)));
  }

  @Patch(':id')
  @ApiOkResponse({ type: MeterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body (utility/zoneScheme are immutable)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeterDto,
  ): Promise<MeterResponseDto> {
    return MeterResponseDto.from(await this.meters.withFlagsOne(await this.meters.update(id, dto)));
  }

  @Put(':id/initial-values')
  @ApiOkResponse({
    type: MeterResponseDto,
    description: 'Cancels the INITIAL reading and creates a corrected one',
  })
  @ApiBadRequestResponse({ description: "Zones don't match zoneScheme" })
  @ApiConflictResponse({ description: 'Meter has REGULAR readings or is removed' })
  async replaceInitialValues(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: InitialValuesDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MeterResponseDto> {
    const meter = await this.meters.replaceInitialValues(id, dto.initialValues, user.id);
    return MeterResponseDto.from(await this.meters.withFlagsOne(meter));
  }

  @Post(':id/remove')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: MeterResponseDto, description: 'CONFIRMED FINAL reading + removedAt' })
  @ApiBadRequestResponse({
    description:
      'Zones mismatch, values lower than last confirmed, date before last reading/in future',
  })
  @ApiConflictResponse({ description: 'Meter already removed' })
  async remove(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: RemoveMeterDto,
    @CurrentUser() user: AuthUser,
  ): Promise<MeterResponseDto> {
    const meter = await this.meters.remove(id, dto, user.id);
    return MeterResponseDto.from(await this.meters.withFlagsOne(meter));
  }

  @Post(':id/replace')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ReplaceMeterResponseDto })
  @ApiBadRequestResponse({ description: 'As for remove, plus zones of the new meter' })
  @ApiConflictResponse({ description: 'Meter already removed, or apartment is archived' })
  async replace(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ReplaceMeterDto,
    @CurrentUser() user: AuthUser,
  ): Promise<ReplaceMeterResponseDto> {
    const { removed, installed } = await this.meters.replace(id, dto, user.id);
    const [old, current] = await this.meters.withFlags([removed, installed]);
    return { removed: MeterResponseDto.from(old), installed: MeterResponseDto.from(current) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Meter and its INITIAL readings deleted' })
  @ApiConflictResponse({ description: 'Meter has REGULAR or FINAL readings' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.meters.delete(id);
  }
}
