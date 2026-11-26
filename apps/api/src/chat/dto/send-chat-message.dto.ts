import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDefined, ValidateNested } from 'class-validator';
import { ChatUserMessageDto } from './chat-user-message.dto.js';

export class SendChatMessageDto {
  @ApiProperty({ type: ChatUserMessageDto })
  @IsDefined()
  @ValidateNested()
  @Type(() => ChatUserMessageDto)
  message: ChatUserMessageDto;
}
