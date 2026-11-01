import { Skeleton } from '@/components/ui/skeleton';

export function ApartmentDetailSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Завантаження">
      <Skeleton className="h-8 w-28" />
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-5 w-72 max-w-full" />
      <Skeleton className="h-11 w-full md:w-96" />
      <Skeleton className="h-48 w-full" />
    </div>
  );
}
