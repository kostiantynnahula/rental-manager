'use client';

import { createDataTableColumnHelper, ukCollator } from '@/components/data-table/features';
import { SortableHeader } from '@/components/data-table/sortable-header';
import type { Apartment } from '@/lib/api/queries/apartments';
import { formatMoney } from '@/lib/format';
import { primaryTenant } from '@/lib/leases';
import { ArchivedBadge } from './archived-badge';

const column = createDataTableColumnHelper<Apartment>();

// Module-level: DataTable needs stable column definitions.
export const apartmentColumns = column.columns([
  column.accessor('name', {
    header: ({ column }) => <SortableHeader column={column}>Назва</SortableHeader>,
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        {row.original.name}
        {!row.original.isActive && <ArchivedBadge />}
      </span>
    ),
    sortFn: (a, b) => ukCollator.compare(a.original.name, b.original.name),
  }),
  column.accessor('address', { header: 'Адреса', enableSorting: false }),
  column.accessor((row) => primaryTenant(row.currentLease)?.fullName ?? '', {
    id: 'tenant',
    header: 'Мешканець',
    cell: ({ getValue }) => getValue() || '—',
    enableSorting: false,
  }),
  column.accessor((row) => row.currentLease?.monthlyRent, {
    id: 'rent',
    header: ({ column }) => <SortableHeader column={column}>Оренда</SortableHeader>,
    cell: ({ getValue }) => {
      const rent = getValue();
      return rent === undefined ? (
        '—'
      ) : (
        <span className="whitespace-nowrap">{formatMoney(rent)}</span>
      );
    },
    // Apartments without a lease go last in both directions.
    sortUndefined: 'last',
  }),
]);
