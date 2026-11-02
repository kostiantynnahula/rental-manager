import { Skeleton } from '@/components/ui/skeleton';

export function LeaseDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Завантаження">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-11 w-full sm:w-80" />
      <div className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    </div>
  );
}
