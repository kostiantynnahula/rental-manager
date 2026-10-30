import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

// Meter values travel as decimal strings, never JS numbers (no float rounding).
// >= 0 (no sign allowed), up to 3 decimals, fits Decimal(12,3) (9 integer digits).
export function IsMeterValue(): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '$property must be a decimal string like "1520.350"' }),
    Matches(/^\d{1,9}(\.\d{1,3})?$/, {
      message:
        '$property must be a non-negative decimal string with up to 3 decimals, like "1520.350"',
    }),
  );
}
