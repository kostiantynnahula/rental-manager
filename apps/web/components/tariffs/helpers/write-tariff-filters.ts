import {
  DEFAULT_TARIFF_ACTIVE,
  TARIFF_DEFAULT_PAGE_SIZE,
  TARIFF_PARAMS,
} from '../constants/filters';
import type { TariffFilters } from '../interfaces/tariff-filters';

// Writes the filters into `params`; defaults are left out of the URL.
export function writeTariffFilters(params: URLSearchParams, filters: TariffFilters): void {
  const set = (name: string, value: string | undefined) => {
    if (value) params.set(name, value);
    else params.delete(name);
  };
  set(TARIFF_PARAMS.active, filters.active === DEFAULT_TARIFF_ACTIVE ? undefined : filters.active);
  set(TARIFF_PARAMS.search, filters.search);
  set(TARIFF_PARAMS.kind, filters.kind);
  set(
    TARIFF_PARAMS.pageSize,
    filters.pageSize === TARIFF_DEFAULT_PAGE_SIZE ? undefined : String(filters.pageSize),
  );
  set(TARIFF_PARAMS.page, filters.page === 1 ? undefined : String(filters.page));
}
