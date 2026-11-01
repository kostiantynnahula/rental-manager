import { Skeleton } from '@/components/ui/skeleton';

export function ApartmentFormSkeleton() {
  return (
    <div className="max-w-xl space-y-6" aria-busy="true" aria-label="Завантаження">
      {[0, 1, 2].map((i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className={i === 2 ? 'h-24 w-full' : 'h-11 w-full'} />
        </div>
      ))}
    </div>
  );
}
