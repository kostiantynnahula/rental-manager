import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { StatementPreviewResponseDto } from './statement-preview-response.dto.js';

export class StatementTotalChangedResponseDto {
  @ApiProperty({ example: 409 })
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ example: 'Conflict' })
  error: string;

  @ApiPropertyOptional({
    type: StatementPreviewResponseDto,
    description: 'Only when the total changed; absent when the period is already issued',
  })
  preview?: StatementPreviewResponseDto;
}
