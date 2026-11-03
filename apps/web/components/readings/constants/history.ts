export const HISTORY_PAGE_SIZES = [10, 20, 50] as const;
export type HistoryPageSize = (typeof HISTORY_PAGE_SIZES)[number];
export const HISTORY_DEFAULT_PAGE_SIZE: HistoryPageSize = 20;

// URL query params of the history filters (the apartment page also has ?tab=).
export const HISTORY_PARAMS = {
  from: 'from',
  to: 'to',
  meters: 'meters',
  pageSize: 'size',
  page: 'page',
} as const;

// Marker next to the meter for INITIAL/FINAL rows (explains why an INITIAL row has no consumption).
export const READING_KIND_NOTES = {
  INITIAL: 'встановлення',
  FINAL: 'зняття',
} as const;
