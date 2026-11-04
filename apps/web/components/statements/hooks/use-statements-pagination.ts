'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';
import type { StatementPageSize } from '@/lib/api/queries/statements';
import {
  STATEMENT_DEFAULT_PAGE_SIZE,
  STATEMENT_LIST_PARAMS,
  STATEMENT_PAGE_SIZES,
} from '../constants/list';

function parsePage(raw: string | null): number {
  const page = Number(raw);
  return Number.isSafeInteger(page) && page >= 1 ? page : 1;
}

function parsePageSize(raw: string | null): StatementPageSize {
  return STATEMENT_PAGE_SIZES.find((s) => String(s) === raw) ?? STATEMENT_DEFAULT_PAGE_SIZE;
}

// Page and size in the URL, defaults left out. Uses useSearchParams → the caller must be inside <Suspense>.
export function useStatementsPagination() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const page = parsePage(searchParams.get(STATEMENT_LIST_PARAMS.page));
  const pageSize = parsePageSize(searchParams.get(STATEMENT_LIST_PARAMS.pageSize));

  // Both params in one router.replace; a new size starts from page 1.
  const write = useCallback(
    (nextPage: number, nextSize: StatementPageSize) => {
      const params = new URLSearchParams(searchParams);
      if (nextPage === 1) params.delete(STATEMENT_LIST_PARAMS.page);
      else params.set(STATEMENT_LIST_PARAMS.page, String(nextPage));
      if (nextSize === STATEMENT_DEFAULT_PAGE_SIZE) params.delete(STATEMENT_LIST_PARAMS.pageSize);
      else params.set(STATEMENT_LIST_PARAMS.pageSize, String(nextSize));
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [pathname, router, searchParams],
  );

  const setPage = useCallback((next: number) => write(next, pageSize), [write, pageSize]);
  const setPageSize = useCallback((next: StatementPageSize) => write(1, next), [write]);

  return { page, pageSize, setPage, setPageSize };
}
