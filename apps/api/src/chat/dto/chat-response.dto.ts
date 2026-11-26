import { ApiProperty } from '@nestjs/swagger';
import type { Chat } from '../../generated/prisma/client.js';

export class ChatResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ format: 'uuid' })
  apartmentId: string;

  @ApiProperty({ type: String, nullable: true, description: 'null = untitled' })
  title: string | null;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;

  static from(c: Chat): ChatResponseDto {
    return {
      id: c.id,
      apartmentId: c.apartmentId,
      title: c.title,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
    };
  }
}
