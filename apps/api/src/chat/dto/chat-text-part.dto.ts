import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString } from 'class-validator';
import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat-agent.js';

// An AI SDK UIMessage text part. The only part a question may have (no files, no tool parts).
export class ChatTextPartDto {
  @ApiProperty({ enum: ['text'] })
  @IsIn(['text'])
  type: 'text';

  // The limit is on all the message's parts together (checked by the service); this keeps one part sane.
  @ApiProperty({ maxLength: CHAT_MESSAGE_MAX_LENGTH })
  @IsString()
  text: string;
}
