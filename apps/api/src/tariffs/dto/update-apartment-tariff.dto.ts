import { ApiProperty } from '@nestjs/swagger';
import { ValidateIf } from 'class-validator';
import { IsPeriod } from '../../common/validators/is-period.decorator.js';

export class UpdateApartmentTariffDto {
  // Required, but null is a value: it reopens an ended attachment.
  @ApiProperty({
    type: String,
    nullable: true,
    example: '2026-12',
    description:
      'Last billed month (inclusive) — "detach from the next month"; null = ongoing again',
  })
  @ValidateIf((_, value) => value !== null)
  @IsPeriod()
  activeTo: string | null;
}
