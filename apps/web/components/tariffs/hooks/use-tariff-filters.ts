'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useMemo } from 'react';
import { parseTariffFilters } from '../helpers/parse-tariff-filters';
import { writeTariffFilters } from '../helpers/write-tariff-filters';
import type { TariffFilters } from '../interfaces/tariff-filters';

// List filters in the URL (reload/share keeps them). Several params change in one router.replace, so they
// never overwrite each other. Any change except the page itself goes back to page 1.
// Uses useSearchParams → must be inside <Suspense> (the tariffs page is).
export function useTariffFilters(): [TariffFilters, (patch: Partial<TariffFilters>) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const filters = useMemo(() => parseTariffFilters(searchParams), [searchParams]);

  const update = useCallback(
    (patch: Partial<TariffFilters>) => {
      const next = { ...filters, page: 1, ...patch };
      const params = new URLSearchParams(searchParams);
      writeTariffFilters(params, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [filters, pathname, router, searchParams],
  );

  return [filters, update];
}
