import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { ChatTextPartDto } from './chat-text-part.dto.js';

// The new question as an AI SDK UIMessage (what useChat sends). The server owns the history: earlier turns are
// never taken from the client.
export class ChatUserMessageDto {
  // The client's id; not stored (the row gets its own uuid).
  @ApiPropertyOptional({ maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  id?: string;

  @ApiProperty({ enum: ['user'] })
  @IsIn(['user'])
  role: 'user';

  @ApiProperty({ type: [ChatTextPartDto], minItems: 1, maxItems: 20 })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => ChatTextPartDto)
  parts: ChatTextPartDto[];
}
