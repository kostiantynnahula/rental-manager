// current = not ended before this month (incl. planned); all = also ended ones.
export const APARTMENT_TARIFF_SCOPES = ['current', 'all'] as const;
export type ApartmentTariffScope = (typeof APARTMENT_TARIFF_SCOPES)[number];
