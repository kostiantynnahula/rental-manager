import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';

export class CreateApartmentTariffDto {
  @ApiProperty({ format: 'uuid', description: 'An active tariff' })
  @IsUUID()
  tariffId: string;

  @ApiProperty({ example: '2026-11', description: 'First billed month' })
  @IsPeriod()
  activeFrom: string;
}
