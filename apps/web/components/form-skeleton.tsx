import { Skeleton } from '@/components/ui/skeleton';

interface FormSkeletonProps {
  // Number of single-line inputs; a textarea (notes) is added after them when `textarea` is true.
  fields: number;
  textarea?: boolean;
}

export function FormSkeleton({ fields, textarea = false }: FormSkeletonProps) {
  return (
    <div className="max-w-xl space-y-6" aria-busy="true" aria-label="Завантаження">
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-11 w-full" />
        </div>
      ))}
      {textarea && (
        <div className="space-y-2">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-24 w-full" />
        </div>
      )}
    </div>
  );
}
