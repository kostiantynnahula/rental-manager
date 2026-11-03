import type { TariffListQuery } from '@/lib/api/queries/tariffs';
import type { TariffFilters } from '../interfaces/tariff-filters';

// Empty search/kind are left out (also keeps the query key stable).
export function toTariffListQuery(filters: TariffFilters): TariffListQuery {
  return {
    active: filters.active,
    page: filters.page,
    pageSize: filters.pageSize,
    ...(filters.search && { search: filters.search }),
    ...(filters.kind && { kind: filters.kind }),
  };
}
