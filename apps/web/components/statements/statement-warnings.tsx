import { TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import type { StatementWarning } from '@/lib/api/queries/statements';
import { statementWarningMessage } from '@/lib/statements';

interface StatementWarningsProps {
  warnings: StatementWarning[];
  // Live preview: amber, MISSING_READING links to this readings form. Without it: the muted block of a saved
  // statement, where there's nothing left to fix.
  readingsHref?: string;
}

export function StatementWarnings({ warnings, readingsHref }: StatementWarningsProps) {
  if (warnings.length === 0) return null;
  const rows = warnings.map((warning, index) => (
    <li
      key={index}
      className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:gap-3"
    >
      <span>{statementWarningMessage(warning)}</span>
      {readingsHref && warning.code === 'MISSING_READING' && (
        <Link
          href={readingsHref}
          className="inline-flex min-h-11 shrink-0 items-center font-medium underline md:min-h-8"
        >
          Внести показання
        </Link>
      )}
    </li>
  ));

  return readingsHref ? (
    <div
      role="status"
      className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-900"
    >
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
      <ul className="min-w-0 flex-1 space-y-1">{rows}</ul>
    </div>
  ) : (
    <div className="rounded-lg border bg-muted px-3 py-2 text-sm text-muted-foreground">
      <p className="mb-1 font-medium">Під час виставлення</p>
      <ul className="space-y-1">{rows}</ul>
    </div>
  );
}
