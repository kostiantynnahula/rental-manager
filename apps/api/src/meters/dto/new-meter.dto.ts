import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';
import { ZoneScheme } from '../../generated/prisma/enums.js';
import { ReadingValueInputDto } from '../../readings/dto/reading-value-input.dto.js';
import { IsReadingValues } from '../../readings/validators/is-reading-values.decorator.js';

// The replacement meter in POST /meters/:id/replace (utility = the old meter's).
export class NewMeterDto {
  @ApiPropertyOptional({
    enum: ZoneScheme,
    enumName: 'ZoneScheme',
    description: 'Defaults to the old meter',
  })
  @IsOptional()
  @IsEnum(ZoneScheme)
  zoneScheme?: ZoneScheme;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  label?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  serialNumber?: string;

  @ApiProperty({ type: [ReadingValueInputDto] })
  @IsReadingValues()
  initialValues: ReadingValueInputDto[];
}
