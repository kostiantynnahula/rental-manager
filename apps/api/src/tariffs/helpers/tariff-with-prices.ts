import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for the tariff response DTOs: the full price history and all apartment attachments (a
// handful of rows per tariff, so current prices and current attachments are picked in JS for any month).
export const tariffWithPricesInclude = {
  prices: { orderBy: [{ effectiveFrom: 'desc' }, { zone: 'asc' }] },
  apartments: {
    include: { apartment: { select: { id: true, name: true } } },
    orderBy: [{ activeFrom: 'desc' }, { id: 'asc' }],
  },
} satisfies Prisma.TariffInclude;

export type TariffWithPrices = Prisma.TariffGetPayload<{
  include: typeof tariffWithPricesInclude;
}>;
