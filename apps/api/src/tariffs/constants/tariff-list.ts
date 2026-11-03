export const TARIFF_LIST_PAGE_SIZES = [10, 20, 50] as const;
export type TariffListPageSize = (typeof TARIFF_LIST_PAGE_SIZES)[number];
export const TARIFF_LIST_DEFAULT_PAGE_SIZE: TariffListPageSize = 20;

export const TARIFF_ACTIVE_FILTERS = ['true', 'false', 'all'] as const;
export type TariffActiveFilter = (typeof TARIFF_ACTIVE_FILTERS)[number];
