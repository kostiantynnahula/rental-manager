import type { StatementPageSize } from '@/lib/api/queries/statements';

export const STATEMENT_PAGE_SIZES = [10, 20, 50] as const satisfies readonly StatementPageSize[];
export const STATEMENT_DEFAULT_PAGE_SIZE: StatementPageSize = 20;

// Not page/size: the readings history on the same apartment page uses those.
export const STATEMENT_LIST_PARAMS = { page: 'stPage', pageSize: 'stSize' } as const;
