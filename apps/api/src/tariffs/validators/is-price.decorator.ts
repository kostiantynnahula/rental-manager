import { applyDecorators } from '@nestjs/common';
import { IsString, Matches } from 'class-validator';

// Tariff prices travel as decimal strings, never JS numbers (no float rounding).
// >= 0 (no sign allowed), up to 4 decimals, fits Decimal(12,4) (8 integer digits).
export function IsPrice(): PropertyDecorator {
  return applyDecorators(
    IsString({ message: '$property must be a decimal string like "4.32"' }),
    Matches(/^\d{1,8}(\.\d{1,4})?$/, {
      message: '$property must be a non-negative decimal string with up to 4 decimals, like "4.32"',
    }),
  );
}
