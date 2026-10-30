import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

// A month as "YYYY-MM" (stored as its 1st day).
export function IsPeriod(): PropertyDecorator {
  return applyDecorators(
    IsString(),
    Matches(/^\d{4}-(0[1-9]|1[0-2])$/, { message: '$property must be a month in YYYY-MM format' }),
  );
}
