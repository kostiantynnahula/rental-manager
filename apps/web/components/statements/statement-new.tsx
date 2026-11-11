'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useMemo, useState } from 'react';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Field, FieldDescription, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useSearchParam } from '@/hooks/use-search-param';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useIssuedStatement, useStatementPreview } from '@/lib/api/queries/statements';
import { formatPeriod, todayDateOnly } from '@/lib/format';
import { defaultReadingPeriod, isPeriod } from '@/lib/period';
import { manualTariffsOf } from './helpers/manual-tariffs-of';
import { parseManualAmount } from './helpers/parse-manual-amount';
import { toManualAmounts } from './helpers/to-manual-amounts';
import type { ManualTariff } from './interfaces/manual-tariff';
import { IssueStatementPanel } from './issue-statement-panel';
import { ManualAmountsFields } from './manual-amounts-fields';
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

      {/* Keyed by month: the manual amounts belong to one month's bills. */}
      <StatementPreviewSection key={period} apartmentId={id} period={period} />
    </section>
  );
}

const NO_TARIFFS: ManualTariff[] = [];

// Preview of one month + the manual amounts typed in for it. The amounts go to the API after a pause in typing;
// until the preview for them is back, issuing is locked (its total would be stale).
function StatementPreviewSection({ apartmentId, period }: { apartmentId: string; period: string }) {
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const debouncedInputs = useDebouncedValue(inputs, 400);
  // The tariffs to ask about come from the last preview; kept here so the amounts can be filtered by them.
  const [tariffs, setTariffs] = useState<ManualTariff[]>(NO_TARIFFS);
  const manualAmounts = useMemo(
    () => toManualAmounts(debouncedInputs, tariffs),
    [debouncedInputs, tariffs],
  );
  const preview = useStatementPreview(apartmentId, period, manualAmounts);

  // Derived state from the latest preview (React's "adjust state during render" pattern, no effect).
  const latest = preview.data ? manualTariffsOf(preview.data) : NO_TARIFFS;
  if (preview.data && !sameTariffs(latest, tariffs)) setTariffs(latest);

  if (preview.isError) {
    return <QueryError error={preview.error} onRetry={() => void preview.refetch()} />;
  }
  if (preview.isPending) {
    return (
      <div className="space-y-2" aria-busy="true" aria-label="Завантаження">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  const recalculating =
    inputs !== debouncedInputs || preview.isPlaceholderData || preview.isFetching;
  // A typo isn't sent: issuing then would silently leave the line out.
  const amountsInvalid = latest.some(({ tariffId }) => {
    const value = inputs[tariffId] ?? '';
    return value.trim() !== '' && parseManualAmount(value) === null;
  });

  return (
    <>
      <ManualAmountsFields
        tariffs={latest}
        inputs={inputs}
        onChange={(tariffId, value) => setInputs((prev) => ({ ...prev, [tariffId]: value }))}
      />
      <StatementWarnings
        warnings={preview.data.warnings}
        readingsHref={`/apartments/${apartmentId}/readings/new?period=${period}`}
      />
      <StatementLines lines={preview.data.lines} total={preview.data.total} />
      <IssueStatementPanel
        key={JSON.stringify(preview.data.warnings)}
        apartmentId={apartmentId}
        period={period}
        preview={preview.data}
        manualAmounts={manualAmounts}
        recalculating={recalculating}
        amountsInvalid={amountsInvalid}
      />
    </>
  );
}

function sameTariffs(a: ManualTariff[], b: ManualTariff[]): boolean {
  return (
    a.length === b.length && a.every((t, i) => t.tariffId === b[i].tariffId && t.name === b[i].name)
  );
}
