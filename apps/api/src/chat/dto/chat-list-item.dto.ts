import { ApiProperty } from '@nestjs/swagger';
import type { ChatListItem } from '../helpers/chat-list-item.js';

export class ChatListItemDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ type: String, nullable: true, description: 'null = untitled' })
  title: string | null;

  @ApiProperty()
  updatedAt: Date;

  @ApiProperty()
  messageCount: number;

  static from(c: ChatListItem): ChatListItemDto {
    return {
      id: c.id,
      title: c.title,
      updatedAt: c.updatedAt,
      messageCount: c._count.messages,
    };
  }
}
