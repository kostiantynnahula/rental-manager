import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { UtilityType, ZoneScheme } from '../../generated/prisma/enums.js';
import { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';
import { IsReadingValues } from '../../readings/validators/is-reading-values.decorator.js';

export class CreateMeterDto {
  @ApiProperty({ enum: UtilityType, enumName: 'UtilityType' })
  @IsEnum(UtilityType)
  utility: UtilityType;

  @ApiProperty({ enum: ZoneScheme, enumName: 'ZoneScheme' })
  @IsEnum(ZoneScheme)
  zoneScheme: ZoneScheme;

  @ApiPropertyOptional({ example: 'kitchen' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional({ example: 'NIK-2303-123456' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiProperty({ format: 'date', example: '2026-01-15', description: 'Not in the future' })
  @IsDateOnly()
  installedAt: string;

  @ApiProperty({
    type: [ReadingValueInputDto],
    description: 'SINGLE → [TOTAL]; DAY_NIGHT → [DAY, NIGHT]',
  })
  @IsReadingValues()
  initialValues: ReadingValueInputDto[];
}
