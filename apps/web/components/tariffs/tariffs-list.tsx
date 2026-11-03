'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { useTariffs, type Tariff, type TariffPageSize } from '@/lib/api/queries/tariffs';
import { DEFAULT_TARIFF_ACTIVE, TARIFF_PAGE_SIZES } from './constants/filters';
import { toTariffListQuery } from './helpers/to-tariff-list-query';
import { useTariffFilters } from './hooks/use-tariff-filters';
import { TariffCard } from './tariff-card';
import { tariffColumns } from './tariff-columns';
import { TariffListFilters } from './tariff-list-filters';

// Module-level so DataTable's memo isn't invalidated on every render.
const tariffHref = (t: Tariff) => `/tariffs/${t.id}`;
const tariffId = (t: Tariff) => t.id;
const renderTariffCard = (t: Tariff) => <TariffCard tariff={t} />;

// Search, filters and page live in the URL; the API searches and paginates.
export function TariffsList() {
  const [filters, setFilters] = useTariffFilters();
  const [input, setInput] = useState(filters.search);
  const debounced = useDebouncedValue(input.trim(), 300);
  const tariffs = useTariffs(toTariffListQuery(filters));

  useEffect(() => {
    if (debounced !== filters.search) setFilters({ search: debounced });
    // Only react to typing; `search` changing from the URL must not write it back.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debounced]);

  // A page past the end (tariffs deleted meanwhile, old link): go to the last page.
  const data = tariffs.data;
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0) {
      setFilters({ page: Math.ceil(data.total / data.pageSize) });
    }
  }, [data, setFilters]);

  const filtered = Boolean(
    filters.search || filters.kind || filters.active !== DEFAULT_TARIFF_ACTIVE,
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Тарифи</h1>
        <Button asChild>
          <Link href="/tariffs/new">
            <Plus />
            Додати тариф
          </Link>
        </Button>
      </div>

      <TariffListFilters
        filters={filters}
        onChange={setFilters}
        searchInput={input}
        onSearchInputChange={setInput}
      />

      {tariffs.isError ? (
        <QueryError error={tariffs.error} onRetry={() => void tariffs.refetch()} />
      ) : (
        <div className={tariffs.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          {/* No getSearchText: the API already filtered by ?search=. */}
          <DataTable
            columns={tariffColumns}
            data={data?.items}
            isLoading={tariffs.isPending}
            getRowId={tariffId}
            getRowHref={tariffHref}
            renderCard={renderTariffCard}
            pagination={
              data && {
                pageIndex: filters.page - 1,
                pageSize: filters.pageSize,
                rowCount: data.total,
                onPageIndexChange: (pageIndex) => setFilters({ page: pageIndex + 1 }),
              }
            }
            pageSize={filters.pageSize}
            pageSizeOptions={TARIFF_PAGE_SIZES}
            // The select only offers TARIFF_PAGE_SIZES.
            onPageSizeChange={(pageSize) => setFilters({ pageSize: pageSize as TariffPageSize })}
            empty={filtered ? 'Нічого не знайдено' : 'Тарифів немає'}
          />
        </div>
      )}
    </section>
  );
}
