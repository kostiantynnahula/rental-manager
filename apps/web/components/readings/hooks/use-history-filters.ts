'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { parseHistoryFilters } from '../helpers/parse-history-filters';
import { writeHistoryFilters } from '../helpers/write-history-filters';
import type { HistoryFilters } from '../interfaces/history-filters';

// History filters in the URL (reload/share keeps them). Several params change in one router.replace, so they
// never overwrite each other. Any change except the page itself goes back to page 1.
// Uses useSearchParams → must be inside <Suspense> (the apartment page is).
export function useHistoryFilters(): [HistoryFilters, (patch: Partial<HistoryFilters>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseHistoryFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<HistoryFilters>) => {
      const next = { ...filters, page: 1, ...patch };
      const params = new URLSearchParams(searchParams);
      writeHistoryFilters(params, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  return [filters, update];
}
