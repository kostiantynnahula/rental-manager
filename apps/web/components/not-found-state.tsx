import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function NotFoundState({
  title,
  backHref,
  backLabel,
}: {
  title: string;
  backHref: string;
  backLabel: string;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-dashed px-4 py-10 text-center">
      <p className="text-lg font-medium">{title}</p>
      <Button asChild variant="outline">
        <Link href={backHref}>{backLabel}</Link>
      </Button>
    </div>
  );
}
