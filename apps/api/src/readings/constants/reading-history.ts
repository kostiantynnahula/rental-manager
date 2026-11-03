export const READING_HISTORY_PAGE_SIZES = [10, 20, 50] as const;
export type ReadingHistoryPageSize = (typeof READING_HISTORY_PAGE_SIZES)[number];
export const READING_HISTORY_DEFAULT_PAGE_SIZE: ReadingHistoryPageSize = 20;
