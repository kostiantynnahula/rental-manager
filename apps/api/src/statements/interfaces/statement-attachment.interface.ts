import type { Prisma } from '../../generated/prisma/client.js';
import type { TariffKind, UtilityType, Zone } from '../../generated/prisma/enums.js';

// A tariff attached to the apartment, with its full price history.
export interface StatementAttachment {
  activeFrom: Date;
  // Last billed month (inclusive); null = ongoing.
  activeTo: Date | null;
  tariff: {
    id: string;
    name: string;
    kind: TariffKind;
    utilities: UtilityType[];
    prices: { effectiveFrom: Date; zone: Zone; price: Prisma.Decimal }[];
  };
}
