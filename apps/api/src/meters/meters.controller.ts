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
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { InitialValuesDto } from './dto/initial-values.dto.js';
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

  @Get(':id')
  @ApiOkResponse({ type: MeterResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<MeterResponseDto> {
    return MeterResponseDto.from(await this.meters.findOrThrow(id));
  }

  @Patch(':id')
  @ApiOkResponse({ type: MeterResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body (utility/zoneScheme are immutable)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateMeterDto,
  ): Promise<MeterResponseDto> {
    return MeterResponseDto.from(await this.meters.update(id, dto));
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
    return MeterResponseDto.from(
      await this.meters.replaceInitialValues(id, dto.initialValues, user.id),
    );
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
    return MeterResponseDto.from(await this.meters.remove(id, dto, user.id));
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
    return { removed: MeterResponseDto.from(removed), installed: MeterResponseDto.from(installed) };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'Meter and its INITIAL readings deleted' })
  @ApiConflictResponse({ description: 'Meter has REGULAR or FINAL readings' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.meters.delete(id);
  }
}
