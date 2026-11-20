import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';
import {
  DESCRIPTION_ITEM_CONDITION_MAX_LENGTH,
  DESCRIPTION_ITEM_NAME_MAX_LENGTH,
} from '../constants/condition-photo-description.js';

// One visible item (furniture, appliance, fixture) on a condition photo. Texts in Ukrainian.
export class ConditionPhotoItemDto {
  @ApiProperty({ example: 'холодильник', maxLength: DESCRIPTION_ITEM_NAME_MAX_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MaxLength(DESCRIPTION_ITEM_NAME_MAX_LENGTH)
  name: string;

  @ApiPropertyOptional({ minimum: 1, description: 'Only when more than one is visible' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(PG_INT_MAX)
  count?: number;

  @ApiPropertyOptional({
    example: 'подряпина на дверцятах',
    maxLength: DESCRIPTION_ITEM_CONDITION_MAX_LENGTH,
    description: 'Visible condition, damage or wear',
  })
  @IsOptional()
  @IsString()
  @MaxLength(DESCRIPTION_ITEM_CONDITION_MAX_LENGTH)
  condition?: string;
}
