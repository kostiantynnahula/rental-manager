import { fromThousandths, toThousandths } from '@rental/shared';
import type { Prisma } from '../../generated/prisma/client.js';

// Decimal → the shared rule's decimal string: "340.000" → "340". toFixed never uses exponent notation; no floats.
export function consumptionString(value: Prisma.Decimal): string {
  return fromThousandths(toThousandths(value.toFixed()));
}
