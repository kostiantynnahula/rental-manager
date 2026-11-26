import { Controller, Get, Param, ParseUUIDPipe, Post } from '@nestjs/common';
import {
  ApiCookieAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { ChatService } from './chat.service.js';
import { ChatListItemDto } from './dto/chat-list-item.dto.js';
import { ChatResponseDto } from './dto/chat-response.dto.js';

// Chat routes nested under an apartment; the rest live in ChatsController. Human-only (no @Scopes).
@ApiTags('chats')
@ApiCookieAuth()
@ApiUnauthorizedResponse()
@Controller('apartments/:apartmentId/chats')
export class ApartmentChatsController {
  constructor(private readonly chats: ChatService) {}

  @Post()
  @ApiCreatedResponse({ type: ChatResponseDto, description: 'An empty, untitled chat' })
  @ApiNotFoundResponse({ description: 'Apartment not found or archived' })
  async create(@Param('apartmentId', ParseUUIDPipe) apartmentId: string): Promise<ChatResponseDto> {
    return ChatResponseDto.from(await this.chats.create(apartmentId));
  }

  @Get()
  @ApiOkResponse({ type: [ChatListItemDto], description: 'By updatedAt (newest first)' })
  @ApiNotFoundResponse({ description: 'Apartment not found' })
  async list(@Param('apartmentId', ParseUUIDPipe) apartmentId: string): Promise<ChatListItemDto[]> {
    const chats = await this.chats.list(apartmentId);
    return chats.map((c) => ChatListItemDto.from(c));
  }
}
