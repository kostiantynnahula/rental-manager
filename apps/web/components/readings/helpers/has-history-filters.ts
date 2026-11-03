import type { HistoryFilters } from '../interfaces/history-filters';

// Filters that narrow the result (page size and page don't).
export function hasHistoryFilters(filters: HistoryFilters): boolean {
  return Boolean(filters.from || filters.to || filters.meterIds.length > 0);
}
