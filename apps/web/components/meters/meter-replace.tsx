'use client';

import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { useMeter } from '@/lib/api/queries/meters';
import { formatDate } from '@/lib/format';
import { meterTitle } from './helpers/meter-title';
import { MeterReplaceForm } from './meter-replace-form';

// /meters/[id]/replace
export function MeterReplace() {
  const { id } = useParams<{ id: string }>();
  const meter = useMeter(id);
  const apartmentId = meter.data?.apartmentId ?? '';
  const apartment = useApartment(apartmentId, { enabled: apartmentId !== '' });

  if (meter.isPending) return <FormSkeleton fields={5} />;
  if (meter.isError) {
    return isNotFoundError(meter.error) ? (
      <NotFoundState title="Лічильник не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={meter.error} onRetry={() => void meter.refetch()} />
    );
  }

  const data = meter.data;
  const notice =
    data.removedAt !== null
      ? `Лічильник знято ${formatDate(data.removedAt)} — замінити його не можна.`
      : apartment.data && !apartment.data.isActive
        ? 'Квартира в архіві: новий лічильник встановити не можна.'
        : null;

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href={`/apartments/${data.apartmentId}?tab=meters`}>
          <ChevronLeft />
          {apartment.data?.name ?? 'Лічильники'}
        </Link>
      </Button>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold">Заміна лічильника</h1>
        <p className="text-muted-foreground">{meterTitle(data)}</p>
      </div>
      {notice ? (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          {notice}
        </p>
      ) : (
        <MeterReplaceForm meter={data} />
      )}
    </section>
  );
}
