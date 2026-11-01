'use client';

import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { useMe } from '@/lib/auth/queries';
import { loginUrl } from '@/lib/auth/redirect';

// Client-side only: the auth cookies are scoped to Path=/api and /api/auth, so page requests never carry
// them and the server can't tell whether you're logged in (see apps/web/CLAUDE.md).
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const me = useMe();
  const router = useRouter();
  const failed = me.isError;

  useEffect(() => {
    // A 401 here means the refresh already failed (the API middleware retries once after refreshing).
    // window.location, not usePathname(): that hook would need a Suspense boundary on dynamic routes.
    if (failed) router.replace(loginUrl(window.location.pathname + window.location.search));
  }, [failed, router]);

  if (!me.isSuccess) return <ShellSkeleton />;
  return children;
}

function ShellSkeleton() {
  return (
    <div className="min-h-dvh md:flex" aria-busy="true" aria-label="Завантаження">
      <div className="hidden w-56 shrink-0 border-r bg-sidebar md:block" />
      <div className="flex-1">
        <div className="flex h-14 items-center justify-between border-b px-4 md:px-6">
          <Skeleton className="h-5 w-32" />
          <Skeleton className="size-9" />
        </div>
        <div className="space-y-3 px-4 pt-4 md:px-6">
          <Skeleton className="h-7 w-40" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    </div>
  );
}
