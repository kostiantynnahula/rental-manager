import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

// Text fields of the inbox upload (multipart, next to "files").
export class UploadPhotosBodyDto {
  @ApiPropertyOptional({
    maxLength: 128,
    example: '123456789:42',
    description:
      "Opaque: where the answer to this batch goes (the bot: chatId:messageId). Stored on the batch's new " +
      'photos; the API never parses it.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(128)
  replyTo?: string;
}
