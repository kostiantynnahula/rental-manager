import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, ValidateIf } from 'class-validator';
import { CHAT_TITLE_MAX_LENGTH } from '../helpers/title.js';

export class UpdateChatDto {
  // Required key (the only field); null or blank = untitled. ValidateIf, not IsOptional: a missing title is a 400.
  @ApiProperty({ type: String, nullable: true, maxLength: CHAT_TITLE_MAX_LENGTH })
  @ValidateIf((_, value) => value !== null)
  @IsString()
  @MaxLength(CHAT_TITLE_MAX_LENGTH)
  title: string | null;
}
