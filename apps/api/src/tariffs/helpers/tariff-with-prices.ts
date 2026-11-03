import { Prisma } from '../../generated/prisma/client.js';

// Prisma include for the tariff response DTOs: the full price history (a handful of rows per
// tariff, so current prices are picked in JS) and the number of apartment attachments.
export const tariffWithPricesInclude = {
  prices: { orderBy: [{ effectiveFrom: 'desc' }, { zone: 'asc' }] },
  _count: { select: { apartments: true } },
} satisfies Prisma.TariffInclude;

export type TariffWithPrices = Prisma.TariffGetPayload<{
  include: typeof tariffWithPricesInclude;
}>;
