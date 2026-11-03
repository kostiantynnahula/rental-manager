import type { HistoryPageSize } from '../constants/history';

// Readings history filters as kept in the URL. Empty string / empty array = not set.
export interface HistoryFilters {
  from: string;
  to: string;
  meterIds: string[];
  pageSize: HistoryPageSize;
  // 1-based, like the API.
  page: number;
}
