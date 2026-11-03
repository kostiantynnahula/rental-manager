import type { TariffActiveFilter, TariffKind, TariffPageSize } from '@/lib/api/queries/tariffs';

export interface TariffFilters {
  active: TariffActiveFilter;
  // '' = no search.
  search: string;
  // '' = any kind.
  kind: TariffKind | '';
  pageSize: TariffPageSize;
  // 1-based.
  page: number;
}
