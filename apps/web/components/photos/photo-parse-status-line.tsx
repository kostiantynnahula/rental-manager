import { CircleAlert, CircleCheck, LoaderCircle } from 'lucide-react';
import type { PhotoParseStatus } from '@/lib/api/queries/photos';
import { cn } from '@/lib/utils';
import { PARSE_STATUS_LINES } from './constants/parse-statuses';

// What the worker made of the photo; nothing for photos uploaded before parsing existed. The note is the worker's
// own (technical) text — why nothing matched, or the error.
export function PhotoParseStatusLine({
  status,
  note,
}: {
  status: PhotoParseStatus | null;
  note: string | null;
}) {
  if (!status) return null;
  const Icon =
    status === 'PENDING' ? LoaderCircle : status === 'PARSED' ? CircleCheck : CircleAlert;
  const failed = status === 'NOT_MATCHED' || status === 'FAILED';
  return (
    <div role="status" className="space-y-1 text-sm">
      <p
        className={cn(
          'flex items-start gap-2',
          failed ? 'text-destructive' : 'text-muted-foreground',
        )}
      >
        <Icon className={cn('mt-0.5 size-4 shrink-0', status === 'PENDING' && 'animate-spin')} />
        {PARSE_STATUS_LINES[status]}
      </p>
      {failed && note && (
        <details className="text-xs text-muted-foreground">
          <summary className="flex min-h-11 cursor-pointer items-center md:min-h-8">Деталі</summary>
          <p className="break-words whitespace-pre-wrap">{note}</p>
        </details>
      )}
    </div>
  );
}
