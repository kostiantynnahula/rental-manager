import { ApiProperty } from '@nestjs/swagger';
import type { ChatMessage } from '../../generated/prisma/client.js';
import { ChatRole } from '../../generated/prisma/enums.js';

export class ChatMessageResponseDto {
  @ApiProperty({ format: 'uuid' })
  id: string;

  @ApiProperty({ enum: ChatRole, enumName: 'ChatRole' })
  role: ChatRole;

  // Json in the DB, stored as-is: the AI SDK UIMessage parts (written by the agent, #159).
  @ApiProperty({
    type: 'array',
    // Not `type: Object`: that becomes Record<string, never> in the web types.
    items: { type: 'object', additionalProperties: true },
    description: 'AI SDK UIMessage parts, e.g. { type: "text", text }',
  })
  parts: Record<string, unknown>[];

  @ApiProperty()
  createdAt: Date;

  static from(m: ChatMessage): ChatMessageResponseDto {
    return {
      id: m.id,
      role: m.role,
      parts: m.parts as Record<string, unknown>[],
      createdAt: m.createdAt,
    };
  }
}
