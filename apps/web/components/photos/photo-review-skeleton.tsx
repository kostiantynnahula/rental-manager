import { FormSkeleton } from '@/components/form-skeleton';
import { Skeleton } from '@/components/ui/skeleton';

export function PhotoReviewSkeleton() {
  return (
    <div className="max-w-2xl space-y-4" aria-busy="true" aria-label="Завантаження">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="aspect-[4/3] w-full" />
      <FormSkeleton fields={4} />
    </div>
  );
}
