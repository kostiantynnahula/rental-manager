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
import { CancelReadingDto } from './dto/cancel-reading.dto.js';
import { ReadingResponseDto } from './dto/reading-response.dto.js';
import { UpdateReadingDto } from './dto/update-reading.dto.js';
import { ReadingsService } from './readings.service.js';

@ApiTags('readings')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Reading not found' })
@Controller('readings')
export class ReadingsController {
  constructor(private readonly readings: ReadingsService) {}

  @Get(':id')
  @ApiOkResponse({ type: ReadingResponseDto })
  async get(@Param('id', ParseUUIDPipe) id: string): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.findOrThrow(id));
  }

  @Patch(':id')
  @ApiOkResponse({ type: ReadingResponseDto })
  @ApiBadRequestResponse({ description: "Invalid body or zones don't match the meter" })
  @ApiConflictResponse({ description: 'Not a DRAFT' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateReadingDto,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.update(id, dto));
  }

  @Post(':id/confirm')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ReadingResponseDto })
  @ApiBadRequestResponse({ description: 'Date outside window/in future, value out of order' })
  @ApiConflictResponse({ description: 'Not a DRAFT, meter removed, or period already confirmed' })
  async confirm(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.confirm(id, user.id));
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: ReadingResponseDto, description: 'Reason is appended to the note' })
  @ApiConflictResponse({ description: 'INITIAL/FINAL reading, or already cancelled' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelReadingDto,
  ): Promise<ReadingResponseDto> {
    return ReadingResponseDto.from(await this.readings.cancel(id, dto.reason));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse()
  @ApiConflictResponse({ description: 'Not a DRAFT' })
  async delete(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.readings.delete(id);
  }
}
