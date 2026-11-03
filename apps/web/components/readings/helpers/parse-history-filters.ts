import { isPeriod } from '@/lib/period';
import {
  HISTORY_DEFAULT_PAGE_SIZE,
  HISTORY_PAGE_SIZES,
  HISTORY_PARAMS,
  type HistoryPageSize,
} from '../constants/history';
import type { HistoryFilters } from '../interfaces/history-filters';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Anything invalid in the URL (hand-edited, old link) falls back to "not set" instead of an API 400.
export function parseHistoryFilters(params: {
  get: (name: string) => string | null;
}): HistoryFilters {
  const period = (name: string) => {
    const value = params.get(name) ?? '';
    return isPeriod(value) ? value : '';
  };
  const size = Number(params.get(HISTORY_PARAMS.pageSize));
  const page = Number(params.get(HISTORY_PARAMS.page));
  return {
    from: period(HISTORY_PARAMS.from),
    to: period(HISTORY_PARAMS.to),
    meterIds: (params.get(HISTORY_PARAMS.meters) ?? '').split(',').filter((id) => UUID.test(id)),
    pageSize: HISTORY_PAGE_SIZES.includes(size as HistoryPageSize)
      ? (size as HistoryPageSize)
      : HISTORY_DEFAULT_PAGE_SIZE,
    page: Number.isInteger(page) && page >= 1 ? page : 1,
  };
}
