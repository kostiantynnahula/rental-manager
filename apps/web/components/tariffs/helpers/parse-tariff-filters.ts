import type { TariffPageSize } from '@/lib/api/queries/tariffs';
import {
  DEFAULT_TARIFF_ACTIVE,
  TARIFF_ACTIVE_FILTERS,
  TARIFF_DEFAULT_PAGE_SIZE,
  TARIFF_KIND_FILTERS,
  TARIFF_PAGE_SIZES,
  TARIFF_PARAMS,
} from '../constants/filters';
import type { TariffFilters } from '../interfaces/tariff-filters';

// Anything invalid in the URL (hand-edited, old link) falls back to the default instead of an API 400.
export function parseTariffFilters(params: {
  get: (name: string) => string | null;
}): TariffFilters {
  const active = params.get(TARIFF_PARAMS.active);
  const kind = params.get(TARIFF_PARAMS.kind);
  const size = Number(params.get(TARIFF_PARAMS.pageSize));
  const page = Number(params.get(TARIFF_PARAMS.page));
  return {
    active: TARIFF_ACTIVE_FILTERS.find((f) => f.value === active)?.value ?? DEFAULT_TARIFF_ACTIVE,
    search: (params.get(TARIFF_PARAMS.search) ?? '').trim().slice(0, 100),
    kind: TARIFF_KIND_FILTERS.find((f) => f.value === kind)?.value ?? '',
    pageSize: TARIFF_PAGE_SIZES.includes(size as TariffPageSize)
      ? (size as TariffPageSize)
      : TARIFF_DEFAULT_PAGE_SIZE,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
