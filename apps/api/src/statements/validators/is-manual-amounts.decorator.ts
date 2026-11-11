import { ValidateBy, isInt, isUUID, max, min, type ValidationOptions } from 'class-validator';
import { PG_INT_MAX } from '../../common/constants/pg-limits.js';

// One entry per MANUAL tariff of an apartment: more is a malformed request.
export const MANUAL_AMOUNTS_MAX_KEYS = 50;

// { [tariffId]: kopiyky }: a plain object, uuid keys, Int values 0..PG_INT_MAX. Whether each id is an active MANUAL
// tariff of the apartment needs the data, so the service checks that (manualAmountsProblem).
export function IsManualAmounts(options?: ValidationOptions): PropertyDecorator {
  return ValidateBy(
    {
      name: 'isManualAmounts',
      validator: {
        validate: (value: unknown) => {
          if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
          const entries = Object.entries(value);
          return (
            entries.length <= MANUAL_AMOUNTS_MAX_KEYS &&
            entries.every(
              ([id, amount]) =>
                isUUID(id) && isInt(amount) && min(amount, 0) && max(amount, PG_INT_MAX),
            )
          );
        },
        defaultMessage: () =>
          `$property must be an object of up to ${MANUAL_AMOUNTS_MAX_KEYS} tariff ids (uuid) to integer kopiyky (0..${PG_INT_MAX})`,
      },
    },
    options,
  );
}
