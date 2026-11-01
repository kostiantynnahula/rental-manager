import { applyDecorators } from '@nestjs/common';
import { normalizeUaPhone } from '@rental/shared';
import { Transform } from 'class-transformer';
import { IsString, Matches } from 'class-validator';

// Accepts "0671234567", "067 123 45 67", "+380 67 123-45-67", "380671234567" and stores "+380671234567".
// The transform runs before validation (ValidationPipe → plainToInstance); unparseable input is left as is,
// so Matches rejects it with a clear message.
export function IsUaPhone(): PropertyDecorator {
  return applyDecorators(
    Transform(({ value }: { value: unknown }) =>
      typeof value === 'string' ? (normalizeUaPhone(value) ?? value) : value,
    ),
    IsString(),
    Matches(/^\+380\d{9}$/, {
      message: '$property must be a Ukrainian number, e.g. 0671234567 or +380671234567',
    }),
  );
}
