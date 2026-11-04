import { ApiProperty } from '@nestjs/swagger';
import { StatementWarningResponseDto } from './statement-warning-response.dto.js';

export class StatementHasWarningsResponseDto {
  @ApiProperty({ example: 422 })
  statusCode: number;

  @ApiProperty()
  message: string;

  @ApiProperty({ example: 'Unprocessable Entity' })
  error: string;

  @ApiProperty({ type: [StatementWarningResponseDto] })
  warnings: StatementWarningResponseDto[];
}
