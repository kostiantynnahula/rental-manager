import { ApiProperty } from '@nestjs/swagger';
import { IsDateOnly } from '../../common/validators/is-date-only.decorator.js';

export class EndLeaseDto {
  @ApiProperty({ format: 'date', example: '2026-05-31', description: 'Inclusive last day' })
  @IsDateOnly()
  endDate: string;
}
