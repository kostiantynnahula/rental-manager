import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiForbiddenResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Scopes } from '../auth/scopes.decorator.js';
import { CurrentUser } from '../auth/current-user.decorator.js';
import { tenantDataOptions } from '../auth/helpers/tenant-data-options.js';
import type { AuthUser } from '../auth/interfaces/auth-user.interface.js';
import { CancelStatementDto } from './dto/cancel-statement.dto.js';
import { StatementResponseDto } from './dto/statement-response.dto.js';
import { StatementsService } from './statements.service.js';

@ApiTags('statements')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('statements')
export class StatementsController {
  constructor(private readonly statements: StatementsService) {}

  @Get(':id')
  // MCP server: one statement (tenant name stripped for API keys).
  @Scopes('statements:read')
  @ApiBearerAuth()
  @ApiOperation({ description: 'API key scope: statements:read' })
  @ApiForbiddenResponse({ description: 'API key without statements:read' })
  @ApiOkResponse({ type: StatementResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid id' })
  @ApiNotFoundResponse({ description: 'Statement not found' })
  async findOne(
    @Param('id', ParseUUIDPipe) id: string,
    @CurrentUser() user: AuthUser,
  ): Promise<StatementResponseDto> {
    return StatementResponseDto.from(
      await this.statements.findOrThrow(id),
      tenantDataOptions(user),
    );
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({
    type: StatementResponseDto,
    description: 'To re-issue the period, POST a new statement afterwards',
  })
  @ApiBadRequestResponse({ description: 'Invalid id or note' })
  @ApiNotFoundResponse({ description: 'Statement not found' })
  @ApiConflictResponse({ description: 'Already cancelled' })
  async cancel(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelStatementDto,
    @CurrentUser() user: AuthUser,
  ): Promise<StatementResponseDto> {
    return StatementResponseDto.from(await this.statements.cancel(id, dto.note, user.id), {
      withTenants: true,
    });
  }
}
