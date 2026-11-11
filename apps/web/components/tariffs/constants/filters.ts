import type { TariffActiveFilter, TariffKind, TariffPageSize } from '@/lib/api/queries/tariffs';

export const TARIFF_ACTIVE_FILTERS: { value: TariffActiveFilter; label: string }[] = [
  { value: 'true', label: 'Активні' },
  { value: 'false', label: 'Архів' },
  { value: 'all', label: 'Усі' },
];
export const DEFAULT_TARIFF_ACTIVE: TariffActiveFilter = 'true';

// '' = any kind.
export const TARIFF_KIND_FILTERS: { value: TariffKind | ''; label: string }[] = [
  { value: '', label: 'Усі типи' },
  { value: 'METERED', label: 'За лічильником' },
  { value: 'FIXED', label: 'Фіксовані' },
  { value: 'MANUAL', label: 'Ручні суми' },
];

export const TARIFF_PAGE_SIZES = [10, 20, 50] as const satisfies readonly TariffPageSize[];
export const TARIFF_DEFAULT_PAGE_SIZE: TariffPageSize = 20;

// URL query params of the list; defaults are left out.
export const TARIFF_PARAMS = {
  active: 'active',
  search: 'search',
  kind: 'kind',
  pageSize: 'size',
  page: 'page',
} as const;
