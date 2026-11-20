import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import {
  SEARCH_DEFAULT_LIMIT,
  SEARCH_MAX_LIMIT,
  SEARCH_QUERY_MAX_LENGTH,
} from '../constants/condition-photo-search.js';
import { ListConditionPhotosQueryDto } from './list-condition-photos-query.dto.js';

// The list's filters (event, from, to) + the query text and a limit.
export class SearchConditionPhotosQueryDto extends ListConditionPhotosQueryDto {
  @ApiProperty({ example: 'холодильник', maxLength: SEARCH_QUERY_MAX_LENGTH })
  @Transform(({ value }: { value: unknown }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  @MaxLength(SEARCH_QUERY_MAX_LENGTH)
  q: string;

  @ApiPropertyOptional({ minimum: 1, maximum: SEARCH_MAX_LIMIT, default: SEARCH_DEFAULT_LIMIT })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(SEARCH_MAX_LIMIT)
  limit: number = SEARCH_DEFAULT_LIMIT;
}
