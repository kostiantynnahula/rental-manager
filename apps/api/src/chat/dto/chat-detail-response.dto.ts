import { ApiProperty } from '@nestjs/swagger';
import type { ChatWithMessages } from '../helpers/chat-with-messages.js';
import { ChatMessageResponseDto } from './chat-message-response.dto.js';
import { ChatResponseDto } from './chat-response.dto.js';

export class ChatDetailResponseDto extends ChatResponseDto {
  @ApiProperty({ type: [ChatMessageResponseDto], description: 'All messages, oldest first' })
  messages: ChatMessageResponseDto[];

  static fromDetail(c: ChatWithMessages): ChatDetailResponseDto {
    return {
      ...ChatResponseDto.from(c),
      messages: c.messages.map((m) => ChatMessageResponseDto.from(m)),
    };
  }
}
