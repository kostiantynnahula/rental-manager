'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useSearchParam } from '@/hooks/use-search-param';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useIssuedStatement, useStatementPreview } from '@/lib/api/queries/statements';
import { formatPeriod, todayDateOnly } from '@/lib/format';
import { defaultReadingPeriod, isPeriod } from '@/lib/period';
import { IssueStatementPanel } from './issue-statement-panel';
import { StatementLines } from './statement-lines';
import { StatementWarnings } from './statement-warnings';

// /apartments/[id]/statements/new?period=YYYY-MM
export function StatementNew() {
  const { id } = useParams<{ id: string }>();
  const defaultPeriod = defaultReadingPeriod(todayDateOnly());
  const [period, setPeriod] = useSearchParam<string>(
    'period',
    (raw) => (raw && isPeriod(raw) ? raw : defaultPeriod),
    defaultPeriod,
  );
  const apartment = useApartment(id);
  const preview = useStatementPreview(id, period);
  const issued = useIssuedStatement(id, period);

  if (apartment.isPending) return <FormSkeleton fields={3} />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }

  return (
    <section className="max-w-2xl space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`/apartments/${id}?tab=statements`}>
          <ChevronLeft />
          {apartment.data.name}
        </Link>
      </Button>
      <h1 className="text-2xl font-semibold">Новий рахунок</h1>

      <Field className="sm:max-w-xs">
        <FieldLabel htmlFor="statement-period">Місяць</FieldLabel>
        <Input
          id="statement-period"
          type="month"
          value={period}
          // Clearing the native input gives "": keep the current month.
          onChange={(e) => {
            if (isPeriod(e.target.value)) setPeriod(e.target.value);
          }}
        />
        <FieldDescription>Рахунок за {formatPeriod(period)}</FieldDescription>
      </Field>

      {issued.data && (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Рахунок за цей місяць уже виставлено.{' '}
          <Link href={`/statements/${issued.data.id}`} className="font-medium underline">
            Відкрити рахунок
          </Link>
        </p>
      )}

      {preview.isError ? (
        <QueryError error={preview.error} onRetry={() => void preview.refetch()} />
      ) : preview.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Завантаження">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : (
        <>
          <StatementWarnings
            warnings={preview.data.warnings}
            readingsHref={`/apartments/${id}/readings/new?period=${period}`}
          />
          <StatementLines lines={preview.data.lines} total={preview.data.total} />
          <IssueStatementPanel
            key={`${period}:${JSON.stringify(preview.data.warnings)}`}
            apartmentId={id}
            period={period}
            preview={preview.data}
          />
        </>
      )}
    </section>
  );
}
