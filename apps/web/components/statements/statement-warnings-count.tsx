import { TriangleAlert } from 'lucide-react';

export function StatementWarningsCount({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span
      className="inline-flex items-center gap-1 text-sm text-amber-700"
      aria-label={`Попереджень: ${count}`}
    >
      <TriangleAlert className="size-4" aria-hidden />
      {count}
    </span>
  );
}
