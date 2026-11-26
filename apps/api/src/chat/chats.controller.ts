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
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiCookieAuth,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service.js';
import { ChatDetailResponseDto } from './dto/chat-detail-response.dto.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';
import { UpdateChatDto } from './dto/update-chat.dto.js';

// Human-only (no @Scopes). An archived apartment's chats can still be read, renamed and deleted.
@ApiTags('chats')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@ApiNotFoundResponse({ description: 'Chat not found' })
@Controller('chats')
export class ChatsController {
  constructor(private readonly chats: ChatService) {}

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
}
