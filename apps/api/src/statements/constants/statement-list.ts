export const STATEMENT_LIST_PAGE_SIZES = [10, 20, 50] as const;
export type StatementListPageSize = (typeof STATEMENT_LIST_PAGE_SIZES)[number];
export const STATEMENT_LIST_DEFAULT_PAGE_SIZE: StatementListPageSize = 20;
