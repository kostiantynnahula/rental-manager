import { Skeleton } from '@/components/ui/skeleton';

interface DataTableSkeletonProps {
  columns?: number;
  rows?: number;
}

// Cards below md, table rows from md (same breakpoint as DataTable).
export function DataTableSkeleton({ columns = 4, rows = 4 }: DataTableSkeletonProps) {
  return (
    <div aria-busy="true" aria-label="Завантаження">
      <div className="space-y-2 md:hidden">
        {Array.from({ length: rows }, (_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <div className="hidden space-y-3 rounded-lg border p-4 md:block">
        {Array.from({ length: rows + 1 }, (_, i) => (
          <div key={i} className="flex gap-4">
            {Array.from({ length: columns }, (_, j) => (
              <Skeleton key={j} className="h-5 flex-1" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
