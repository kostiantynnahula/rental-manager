'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useApartmentLeases, type Lease } from '@/lib/api/queries/leases';
import { LEASES_INITIAL_SORTING } from './constants/sorting';
import { CurrentLeaseCard } from './current-lease-card';
import { LeaseCard } from './lease-card';
import { leaseColumns } from './lease-columns';

// Module-level so DataTable's memo isn't invalidated on every render.
const leaseHref = (l: Lease) => `/leases/${l.id}?from=apartment`;
const leaseId = (l: Lease) => l.id;
const renderLeaseCard = (l: Lease) => <LeaseCard lease={l} />;

// Apartment page, tab "Договори": current lease + full history (newest first).
export function ApartmentLeasesTab({ apartment }: { apartment: Apartment }) {
  const leases = useApartmentLeases(apartment.id);

  return (
    <div className="space-y-4">
      {/* The API refuses new leases for an archived apartment (409). */}
      {apartment.isActive && (
        <Button asChild className="w-full sm:w-auto">
          <Link href={`/apartments/${apartment.id}/leases/new`}>
            <Plus />
            Новий договір
          </Link>
        </Button>
      )}
      <CurrentLeaseCard lease={apartment.currentLease} />
      <h2 className="text-lg font-semibold">Історія</h2>
      {leases.isError ? (
        <QueryError error={leases.error} onRetry={() => void leases.refetch()} />
      ) : (
        <DataTable
          columns={leaseColumns}
          data={leases.data}
          isLoading={leases.isPending}
          getRowId={leaseId}
          getRowHref={leaseHref}
          renderCard={renderLeaseCard}
          initialSorting={LEASES_INITIAL_SORTING}
          empty="Договорів немає"
        />
      )}
    </div>
  );
}
