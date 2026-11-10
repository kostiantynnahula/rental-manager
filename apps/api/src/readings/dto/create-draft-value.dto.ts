import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';
import { Zone } from '../../generated/prisma/enums.js';
import { IsMeterValue } from '../validators/is-meter-value.decorator.js';

// One zone's value read from one photo (the worker). The API picks the draft it goes into.
export class CreateDraftValueDto {
  @ApiProperty({ example: '2026-10', description: 'Month the reading is for' })
  @IsPeriod()
  period: string;

  @ApiProperty({
    format: 'date',
    example: '2026-10-28',
    description: 'Used for a new draft; an existing draft keeps its own',
  })
  @IsDateOnly()
  readingDate: string;

  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  @IsEnum(Zone)
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string, >= 0, up to 3 decimals' })
  @IsMeterValue()
  value: string;

  @ApiProperty({ format: 'uuid', description: 'Photo of this apartment the value was read from' })
  @IsUUID()
  photoId: string;

  @ApiPropertyOptional({ description: "Appended to the draft's note" })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}
