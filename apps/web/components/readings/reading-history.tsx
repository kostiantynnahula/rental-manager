'use client';

import { useEffect } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useApartmentMeters } from '@/lib/api/queries/meters';
import { useReadingHistory, type ReadingHistoryItem } from '@/lib/api/queries/readings';
import { UTILITY_ORDER } from '@/lib/utilities';
import { hasHistoryFilters } from './helpers/has-history-filters';
import { toHistoryQuery } from './helpers/to-history-query';
import { useHistoryFilters } from './hooks/use-history-filters';
import { ReadingHistoryCard } from './reading-history-card';
import { readingHistoryColumns } from './reading-history-columns';
import { ReadingHistoryFilters } from './reading-history-filters';

// Module-level so DataTable's memo isn't invalidated on every render.
const historyRowId = (item: ReadingHistoryItem) => item.id;
const renderHistoryCard = (item: ReadingHistoryItem) => <ReadingHistoryCard item={item} />;

// Confirmed readings of the apartment with consumption; filters and page live in the URL.
export function ReadingHistory({ apartment }: { apartment: Apartment }) {
  const [filters, setFilters] = useHistoryFilters();
  const rangeInvalid = Boolean(filters.from && filters.to && filters.from > filters.to);
  const history = useReadingHistory(apartment.id, toHistoryQuery(filters), {
    enabled: !rangeInvalid,
  });
  const meters = useApartmentMeters(apartment.id, true);
  const orderedMeters = UTILITY_ORDER.flatMap((u) =>
    (meters.data ?? []).filter((m) => m.utility === u),
  );

  // A page past the end (rows deleted meanwhile, old link): go to the last page.
  const data = history.data;
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0) {
      setFilters({ page: Math.ceil(data.total / data.pageSize) });
    }
  }, [data, setFilters]);

  const filtered = hasHistoryFilters(filters);
  const resetFilters = () => setFilters({ from: '', to: '', meterIds: [] });

  return (
    <section className="space-y-4" aria-label="Історія показань">
      <ReadingHistoryFilters
        filters={filters}
        onChange={setFilters}
        meters={orderedMeters}
        rangeInvalid={rangeInvalid}
      />
      {history.isError ? (
        <QueryError error={history.error} onRetry={() => void history.refetch()} />
      ) : rangeInvalid ? null : (
        <div className={history.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            columns={readingHistoryColumns}
            data={data?.items}
            isLoading={history.isPending}
            getRowId={historyRowId}
            renderCard={renderHistoryCard}
            pagination={
              data && {
                pageIndex: filters.page - 1,
                pageSize: filters.pageSize,
                rowCount: data.total,
                onPageIndexChange: (pageIndex) => setFilters({ page: pageIndex + 1 }),
              }
            }
            empty={
              <div className="space-y-3">
                <p>Показань немає</p>
                {filtered && (
                  <>
                    <p className="text-sm">Спробуйте змінити або скинути фільтри</p>
                    <Button type="button" variant="outline" onClick={resetFilters}>
                      Скинути фільтри
                    </Button>
                  </>
                )}
              </div>
            }
          />
        </div>
      )}
    </section>
  );
}
