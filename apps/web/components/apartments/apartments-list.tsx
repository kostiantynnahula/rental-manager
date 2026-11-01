'use client';

import { Plus, Search } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  useApartments,
  type Apartment,
  type ApartmentActiveFilter,
} from '@/lib/api/queries/apartments';
import { cn } from '@/lib/utils';
import { ApartmentCard } from './apartment-card';
import { apartmentColumns } from './apartment-columns';
import { APARTMENT_FILTERS, DEFAULT_APARTMENT_FILTER } from './constants/filters';
import { APARTMENTS_INITIAL_SORTING } from './constants/sorting';
import { parseActiveFilter } from './helpers/parse-active-filter';

// Module-level so DataTable's memo isn't invalidated on every render.
const apartmentSearchText = (a: Apartment) => `${a.name} ${a.address}`;
const apartmentHref = (a: Apartment) => `/apartments/${a.id}`;
const apartmentId = (a: Apartment) => a.id;
const renderApartmentCard = (a: Apartment) => <ApartmentCard apartment={a} />;

export function ApartmentsList() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const active = parseActiveFilter(searchParams.get('active'));
  const [search, setSearch] = useState('');
  const apartments = useApartments(active);

  function setActive(value: ApartmentActiveFilter) {
    const params = new URLSearchParams(searchParams);
    if (value === DEFAULT_APARTMENT_FILTER) params.delete('active');
    else params.set('active', value);
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Квартири</h1>
        <Button asChild>
          <Link href="/apartments/new">
            <Plus />
            Додати квартиру
          </Link>
        </Button>
      </div>

      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <div
          role="group"
          aria-label="Фільтр"
          className="grid grid-cols-3 rounded-lg bg-muted p-1 md:inline-grid"
        >
          {APARTMENT_FILTERS.map((filter) => (
            <button
              key={filter.value}
              type="button"
              aria-pressed={active === filter.value}
              onClick={() => setActive(filter.value)}
              className={cn(
                'h-10 rounded-md px-4 text-sm font-medium text-muted-foreground transition-colors md:h-8',
                active === filter.value && 'bg-background text-foreground shadow-sm',
              )}
            >
              {filter.label}
            </button>
          ))}
        </div>
        <div className="relative md:max-w-xs md:flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Пошук за назвою або адресою"
            aria-label="Пошук за назвою або адресою"
            className="pl-9"
          />
        </div>
      </div>

      {apartments.isError ? (
        <QueryError error={apartments.error} onRetry={() => void apartments.refetch()} />
      ) : (
        <DataTable
          columns={apartmentColumns}
          data={apartments.data}
          isLoading={apartments.isPending}
          getRowId={apartmentId}
          getRowHref={apartmentHref}
          renderCard={renderApartmentCard}
          search={search}
          getSearchText={apartmentSearchText}
          initialSorting={APARTMENTS_INITIAL_SORTING}
          empty={search.trim() ? 'Нічого не знайдено' : 'Квартир немає'}
        />
      )}
    </section>
  );
}
