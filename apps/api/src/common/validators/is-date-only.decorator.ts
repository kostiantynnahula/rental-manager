import { applyDecorators } from '@nestjs/common';
import { IsISO8601, Matches } from 'class-validator';

// "YYYY-MM-DD" and a real calendar day (strict rejects 2026-02-30).
export function IsDateOnly(): PropertyDecorator {
  return applyDecorators(
    Matches(/^\d{4}-\d{2}-\d{2}$/, { message: '$property must be a date in YYYY-MM-DD format' }),
    IsISO8601({ strict: true }, { message: '$property must be a valid calendar date' }),
  );
}
