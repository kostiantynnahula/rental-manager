'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useApartmentTariffs } from '@/lib/api/queries/apartment-tariffs';
import { ApartmentTariffCard } from './apartment-tariff-card';
import { AttachTariffSheet } from './attach-tariff-sheet';

// Apartment page, tab "Тарифи": tariffs applying now or planned (API order: tariff name); ended ones only with
// "Показати завершені".
export function ApartmentTariffsTab({ apartment }: { apartment: Apartment }) {
  const [showEnded, setShowEnded] = useState(false);
  const [attaching, setAttaching] = useState(false);
  const attachments = useApartmentTariffs(apartment.id, showEnded ? 'all' : 'current');
  const attachedNow = (attachments.data ?? []).filter((a) => a.isCurrent).map((a) => a.tariff.id);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        {/* The API refuses new attachments for an archived apartment (409). */}
        {apartment.isActive && (
          <Button className="w-full sm:w-auto" onClick={() => setAttaching(true)}>
            <Plus />
            Підключити тариф
          </Button>
        )}
        <Button
          type="button"
          variant={showEnded ? 'secondary' : 'outline'}
          aria-pressed={showEnded}
          onClick={() => setShowEnded((v) => !v)}
          className="w-full sm:ml-auto sm:w-auto"
        >
          {showEnded ? 'Сховати завершені' : 'Показати завершені'}
        </Button>
      </div>

      {attachments.isError ? (
        <QueryError error={attachments.error} onRetry={() => void attachments.refetch()} />
      ) : attachments.isPending ? (
        <div className="space-y-2" aria-busy="true" aria-label="Завантаження">
          <Skeleton className="h-28 w-full" />
          <Skeleton className="h-28 w-full" />
        </div>
      ) : attachments.data.length === 0 ? (
        <div className="space-y-3 rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
          <p>Тарифів не підключено</p>
          {apartment.isActive && (
            <Button asChild variant="outline">
              <Link href={`/tariffs/new?apartmentId=${apartment.id}`}>Створити тариф</Link>
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {attachments.data.map((attachment) => (
            <ApartmentTariffCard
              key={attachment.id}
              apartment={apartment}
              attachment={attachment}
            />
          ))}
        </div>
      )}

      <AttachTariffSheet
        apartmentId={apartment.id}
        attachedTariffIds={attachedNow}
        open={attaching}
        onOpenChange={setAttaching}
      />
    </div>
  );
}
