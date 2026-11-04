'use client';

import { ChevronLeft, Pencil } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useSearchParam } from '@/hooks/use-search-param';
import { isNotFoundError } from '@/lib/api/api-error';
import { useApartment } from '@/lib/api/queries/apartments';
import { ApartmentDetailSkeleton } from './apartment-detail-skeleton';
import { ApartmentLeasesTab } from '@/components/leases/apartment-leases-tab';
import { ApartmentMetersTab } from '@/components/meters/apartment-meters-tab';
import { ApartmentReadingsTab } from '@/components/readings/apartment-readings-tab';
import { ApartmentStatementsTab } from '@/components/statements/apartment-statements-tab';
import { ApartmentTariffsTab } from '@/components/tariffs/apartment-tariffs-tab';
import { ApartmentOverview } from './apartment-overview';
import { ArchiveButton } from './archive-button';
import { ArchivedBadge } from './archived-badge';
import { APARTMENT_TABS, DEFAULT_APARTMENT_TAB } from './constants/tabs';
import { parseTab } from './helpers/parse-tab';

export function ApartmentDetail() {
  const { id } = useParams<{ id: string }>();
  const [tab, setTab] = useSearchParam('tab', parseTab, DEFAULT_APARTMENT_TAB);
  const apartment = useApartment(id);

  if (apartment.isPending) return <ApartmentDetailSkeleton />;
  if (apartment.isError) {
    return isNotFoundError(apartment.error) ? (
      <NotFoundState title="Квартиру не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={apartment.error} onRetry={() => void apartment.refetch()} />
    );
  }

  const data = apartment.data;

  return (
    <section className="space-y-4">
      <Button asChild variant="ghost" className="-ml-3">
        <Link href="/">
          <ChevronLeft />
          Квартири
        </Link>
      </Button>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-semibold break-words">{data.name}</h1>
            {!data.isActive && <ArchivedBadge />}
          </div>
          <p className="text-muted-foreground">{data.address}</p>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:shrink-0">
          <Button asChild variant="outline">
            <Link href={`/apartments/${data.id}/edit`}>
              <Pencil />
              Редагувати
            </Link>
          </Button>
          <ArchiveButton apartment={data} />
        </div>
      </div>

      {!data.isActive && (
        <p role="status" className="rounded-lg border bg-muted px-4 py-3 text-sm">
          Квартира в архіві: її не видно серед активних, нові договори для неї створити не можна.
        </p>
      )}

      <Tabs value={tab} onValueChange={(value) => setTab(parseTab(value))}>
        {/* Scrolls sideways on narrow screens instead of squeezing seven labels into 375px. */}
        <div className="-mx-4 overflow-x-auto px-4 md:mx-0 md:px-0">
          <TabsList className="group-data-horizontal/tabs:h-11 md:group-data-horizontal/tabs:h-8">
            {APARTMENT_TABS.map((t) => (
              <TabsTrigger key={t.value} value={t.value} className="px-3">
                {t.label}
              </TabsTrigger>
            ))}
          </TabsList>
        </div>
        <TabsContent value="overview" className="pt-2">
          <ApartmentOverview apartment={data} />
        </TabsContent>
        <TabsContent value="readings" className="pt-2">
          <ApartmentReadingsTab apartment={data} />
        </TabsContent>
        <TabsContent value="meters" className="pt-2">
          <ApartmentMetersTab apartment={data} />
        </TabsContent>
        <TabsContent value="tariffs" className="pt-2">
          <ApartmentTariffsTab apartment={data} />
        </TabsContent>
        <TabsContent value="statements" className="pt-2">
          <ApartmentStatementsTab apartment={data} />
        </TabsContent>
        <TabsContent value="leases" className="pt-2">
          <ApartmentLeasesTab apartment={data} />
        </TabsContent>
        {APARTMENT_TABS.filter(
          (t) =>
            !['overview', 'readings', 'meters', 'tariffs', 'statements', 'leases'].includes(
              t.value,
            ),
        ).map((t) => (
          <TabsContent key={t.value} value={t.value} className="pt-2">
            <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
              Скоро
            </p>
          </TabsContent>
        ))}
      </Tabs>
    </section>
  );
}
