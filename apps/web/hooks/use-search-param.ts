'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback } from 'react';

// One URL query param as state. The default value is left out of the URL (clean links); `parse` maps a missing or
// unknown value to a valid one. Uses useSearchParams → the caller must be inside <Suspense> (cacheComponents).
export function useSearchParam<T extends string>(
  name: string,
  parse: (raw: string | null) => T,
  defaultValue: T,
): [T, (value: T) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const value = parse(searchParams.get(name));

  const setValue = useCallback(
    (next: T) => {
      const params = new URLSearchParams(searchParams);
      if (next === defaultValue) params.delete(name);
      else params.set(name, next);
      const query = params.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    },
    [defaultValue, name, pathname, router, searchParams],
  );

  return [value, setValue];
}
