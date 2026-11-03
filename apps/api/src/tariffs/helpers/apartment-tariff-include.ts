import { Prisma } from '../../generated/prisma/client.js';
import { tariffWithPricesInclude } from './tariff-with-prices.js';

// Prisma include for ApartmentTariffResponseDto: the attached tariff with its prices (current prices and
// apartmentCount are picked in JS).
export const apartmentTariffInclude = {
  tariff: { include: tariffWithPricesInclude },
} satisfies Prisma.ApartmentTariffInclude;

export type ApartmentTariffWithTariff = Prisma.ApartmentTariffGetPayload<{
  include: typeof apartmentTariffInclude;
}>;
