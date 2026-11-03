import type { ReadingHistoryQuery } from '@/lib/api/queries/readings';
import type { HistoryFilters } from '../interfaces/history-filters';

// Unset filters are left out, so the query key (and the request) stay minimal.
export function toHistoryQuery(filters: HistoryFilters): ReadingHistoryQuery {
  return {
    ...(filters.from && { from: filters.from }),
    ...(filters.to && { to: filters.to }),
    ...(filters.meterIds.length > 0 && { meterIds: filters.meterIds }),
    page: filters.page,
    pageSize: filters.pageSize,
  };
}
