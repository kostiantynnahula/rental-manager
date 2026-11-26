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
  Res,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiProduces,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ChatAgentService } from './chat-agent.service.js';
import { ChatService } from './chat.service.js';
import { ChatDetailResponseDto } from './dto/chat-detail-response.dto.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';
import { SendChatMessageDto } from './dto/send-chat-message.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

// Human-only (no @Scopes). An archived apartment's chats can still be read, renamed and deleted.
@ApiTags('chats')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Chat not found' })
@Controller('chats')
export class ChatsController {
  constructor(
    private readonly chats: ChatService,
    private readonly agent: ChatAgentService,
  ) {}

  @Get(':id')
  @ApiOkResponse({ type: ChatDetailResponseDto })
  async findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ChatDetailResponseDto> {
    return ChatDetailResponseDto.fromDetail(await this.chats.findDetailOrThrow(id));
  }

  @Patch(':id')
  @ApiOkResponse({ type: ChatResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid body (title missing, not a string, > 100)' })
  async update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateChatDto,
  ): Promise<ChatResponseDto> {
    return ChatResponseDto.from(await this.chats.update(id, dto));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiNoContentResponse({ description: 'The chat and all its messages deleted' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.chats.delete(id);
  }

  // The answer streams as the AI SDK UI message stream (SSE): text, tool calls and results, a data-sources part
  // (the photo ids the answer cites), then finish. A failure after the stream started is an error part, not a status.
  @Post(':id/messages')
  @ApiProduces('text/event-stream')
  @ApiOkResponse({
    description: 'AI SDK UI message stream (Server-Sent Events)',
    content: { 'text/event-stream': { schema: { type: 'string' } } },
  })
  @ApiBadRequestResponse({
    description: 'Invalid body (not a user text message, blank, > 2000 chars)',
  })
  @ApiConflictResponse({ description: 'An answer in this chat is still being written' })
  @ApiServiceUnavailableResponse({ description: 'The chat agent is not configured' })
  async sendMessage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: SendChatMessageDto,
    @Res() res: Response,
  ): Promise<void> {
    await this.agent.send(id, dto, res);
  }
}
