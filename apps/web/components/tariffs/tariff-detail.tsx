'use client';

import { ChevronLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArchivedBadge } from '@/components/apartments/archived-badge';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { isNotFoundError } from '@/lib/api/api-error';
import { useTariff } from '@/lib/api/queries/tariffs';
import { DeleteTariffButton } from './delete-tariff-button';
import { TariffApartments } from './tariff-apartments';
import { TariffArchiveButton } from './tariff-archive-button';
import { TariffDetailSkeleton } from './tariff-detail-skeleton';
import { TariffOverview } from './tariff-overview';
import { TariffPrices } from './tariff-prices';

export function TariffDetail() {
  const { id } = useParams<{ id: string }>();
  const tariff = useTariff(id);

  if (tariff.isPending) return <TariffDetailSkeleton />;
  if (tariff.isError) {
    return isNotFoundError(tariff.error) ? (
      <NotFoundState title="Тариф не знайдено" backHref="/tariffs" backLabel="До списку тарифів" />
    ) : (
      <QueryError error={tariff.error} onRetry={() => void tariff.refetch()} />
    );
  }

  const data = tariff.data;

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href="/tariffs">
          <ChevronLeft />
          Тарифи
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <h1 className="flex min-w-0 flex-wrap items-center gap-2 text-2xl font-semibold break-words">
          {data.name}
          {!data.isActive && <ArchivedBadge />}
        </h1>
        <div className="grid grid-cols-2 items-start gap-2 sm:flex sm:shrink-0">
          <Button asChild variant="outline">
            <Link href={`/tariffs/${data.id}/edit`}>
              <Pencil />
              Редагувати
            </Link>
          </Button>
          <TariffArchiveButton tariff={data} />
          <div className="col-span-2 sm:col-span-1">
            <DeleteTariffButton tariff={data} />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 md:items-start">
        <div className="space-y-4">
          <TariffOverview tariff={data} />
          <TariffApartments tariff={data} />
        </div>
        <TariffPrices tariff={data} />
      </div>
    </section>
  );
}
