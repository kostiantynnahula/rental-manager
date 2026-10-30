import { ApiProperty } from '@nestjs/swagger';
import { IsEnum } from 'class-validator';
import { Zone } from '../../generated/prisma/enums.js';
import { IsMeterValue } from '../validators/is-meter-value.decorator.js';

export class ReadingValueInputDto {
  @ApiProperty({ enum: Zone, enumName: 'Zone' })
  @IsEnum(Zone)
  zone: Zone;

  @ApiProperty({ example: '1520.350', description: 'Decimal string, >= 0, up to 3 decimals' })
  @IsMeterValue()
  value: string;
}
