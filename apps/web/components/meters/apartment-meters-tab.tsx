'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useApartmentMeters } from '@/lib/api/queries/meters';
import { UTILITY_LABELS, UTILITY_ORDER } from '@/lib/utilities';
import { MeterCard } from './meter-card';

// Apartment page, tab "Лічильники": meters grouped by utility; removed ones only with "Показати зняті".
export function ApartmentMetersTab({ apartment }: { apartment: Apartment }) {
  const [showRemoved, setShowRemoved] = useState(false);
  const meters = useApartmentMeters(apartment.id, showRemoved);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* The API refuses new meters for an archived apartment (409). */}
        {apartment.isActive && (
          <Button asChild className="w-full sm:w-auto">
            <Link href={`/apartments/${apartment.id}/meters/new`}>
              <Plus />
              Додати лічильник
            </Link>
          </Button>
        )}
        <Button
          type="button"
          variant={showRemoved ? 'secondary' : 'outline'}
          aria-pressed={showRemoved}
          onClick={() => setShowRemoved((v) => !v)}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {showRemoved ? 'Сховати зняті' : 'Показати зняті'}
        </Button>
      </div>

      {meters.isError ? (
        <QueryError error={meters.error} onRetry={() => void meters.refetch()} />
      ) : meters.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Завантаження">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : meters.data.length === 0 ? (
        <p className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          Лічильників немає
        </p>
      ) : (
        UTILITY_ORDER.map((utility) => {
          // API order within a utility: label, then newest installation first.
          const group = meters.data.filter((m) => m.utility === utility);
          if (group.length === 0) return null;
          return (
            <section key={utility} className="space-y-2">
              <h2 className="text-lg font-semibold">{UTILITY_LABELS[utility]}</h2>
              <div className="grid gap-2 md:grid-cols-2">
                {group.map((meter) => (
                  <MeterCard key={meter.id} meter={meter} />
                ))}
              </div>
            </section>
          );
        })
      )}
    </div>
  );
}
