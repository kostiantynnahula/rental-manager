import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiUnprocessableEntityResponse,
} from '@nestjs/swagger';
import { CurrentUser } from '../auth/current-user.decorator.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { parsePeriod } from '../common/helpers/period.js';
import { IssueStatementDto } from './dto/issue-statement.dto.js';
import { ListStatementsQueryDto } from './dto/list-statements-query.dto.js';
import { StatementHasWarningsResponseDto } from './dto/statement-has-warnings-response.dto.js';
import { StatementPageResponseDto } from './dto/statement-page-response.dto.js';
import { StatementPreviewQueryDto } from './dto/statement-preview-query.dto.js';
import { StatementPreviewResponseDto } from './dto/statement-preview-response.dto.js';
import { StatementResponseDto } from './dto/statement-response.dto.js';
import { StatementTotalChangedResponseDto } from './dto/statement-total-changed-response.dto.js';
import { StatementsService } from './statements.service.js';

@ApiTags('statements')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/statements')
export class ApartmentStatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get('preview')
  @ApiOkResponse({
    type: StatementPreviewResponseDto,
    description: 'Calculated on the fly from confirmed readings; nothing is saved',
  })
  @ApiBadRequestResponse({ description: 'Missing or invalid period' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async preview(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: StatementPreviewQueryDto,
  ): Promise<StatementPreviewResponseDto> {
    const period = parsePeriod(query.period);
    return StatementPreviewResponseDto.from(
      await this.statements.preview(apartmentId, period),
      period,
    );
  }

  @Get()
  @ApiOkResponse({
    type: StatementPageResponseDto,
    description: 'Newest period first, cancelled included',
  })
  @ApiBadRequestResponse({ description: 'Invalid page or pageSize' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async list(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Query() query: ListStatementsQueryDto,
  ): Promise<StatementPageResponseDto> {
    return StatementPageResponseDto.from(
      await this.statements.list(
        apartmentId,
        query.page,
        query.pageSize,
        query.period ? parsePeriod(query.period) : undefined,
      ),
    );
  }

  @Post()
  @ApiCreatedResponse({ type: StatementResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  @ApiConflictResponse({
    type: StatementTotalChangedResponseDto,
    description: 'The total differs from expectedTotal, or the period is already issued',
  })
  @ApiUnprocessableEntityResponse({
    type: StatementHasWarningsResponseDto,
    description: 'Warnings not acknowledged',
  })
  async issue(
    @Param('apartmentId', ParseUUIDPipe) apartmentId: string,
    @Body() dto: IssueStatementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StatementResponseDto> {
    return StatementResponseDto.from(
      await this.statements.issue(
        apartmentId,
        parsePeriod(dto.period),
        dto.expectedTotal,
        dto.acknowledgeWarnings ?? false,
        user.id,
      ),
    );
  }
}
