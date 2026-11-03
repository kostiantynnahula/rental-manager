import { HISTORY_DEFAULT_PAGE_SIZE, HISTORY_PARAMS } from '../constants/history';
import type { HistoryFilters } from '../interfaces/history-filters';

// Writes the filters into `params` (other params like ?tab= stay); defaults are left out of the URL.
export function writeHistoryFilters(params: URLSearchParams, filters: HistoryFilters): void {
  const set = (name: string, value: string | undefined) => {
    if (value) params.set(name, value);
    else params.delete(name);
  };
  set(HISTORY_PARAMS.from, filters.from);
  set(HISTORY_PARAMS.to, filters.to);
  set(HISTORY_PARAMS.meters, filters.meterIds.join(','));
  set(
    HISTORY_PARAMS.pageSize,
    filters.pageSize === HISTORY_DEFAULT_PAGE_SIZE ? undefined : String(filters.pageSize),
  );
  set(HISTORY_PARAMS.page, filters.page === 1 ? undefined : String(filters.page));
}
