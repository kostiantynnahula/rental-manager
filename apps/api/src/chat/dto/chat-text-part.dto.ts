import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsString, MaxLength } from 'class-validator';
import { CHAT_MESSAGE_MAX_LENGTH } from '../constants/chat-agent.js';

// An AI SDK UIMessage text part. The only part a question may have (no files, no tool parts).
export class ChatTextPartDto {
  @ApiProperty({ enum: ['text'] })
  @IsIn(['text'])
  type: 'text';

  // Also on all the parts together, trimmed (checked by the service).
  @ApiProperty({ maxLength: CHAT_MESSAGE_MAX_LENGTH })
  @IsString()
  @MaxLength(CHAT_MESSAGE_MAX_LENGTH)
  text: string;
}
