import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import { PhotoParseStatus } from '../../generated/prisma/enums.js';

// The final states only: PENDING is set by the API on upload.
const PARSE_RESULTS = [
  PhotoParseStatus.PARSED,
  PhotoParseStatus.NOT_MATCHED,
  PhotoParseStatus.FAILED,
] as const;

// The worker's verdict when its parse job ends.
export class SetParseResultDto {
  @ApiProperty({ enum: PARSE_RESULTS, enumName: 'PhotoParseResult' })
  @IsIn(PARSE_RESULTS)
  status: (typeof PARSE_RESULTS)[number];

  @ApiPropertyOptional({ description: 'Why nothing was matched, or the error' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
