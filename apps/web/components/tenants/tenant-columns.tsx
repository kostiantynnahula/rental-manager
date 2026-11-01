'use client';

import { createDataTableColumnHelper, ukCollator } from '@/components/data-table/features';
import { SortableHeader } from '@/components/data-table/sortable-header';
import type { TenantListItem } from '@/lib/api/queries/tenants';
import { formatPhone } from '@/lib/phone';
import { TenantStatusBadge } from './tenant-status-badge';

const column = createDataTableColumnHelper<TenantListItem>();

// Module-level: DataTable needs stable column definitions.
export const tenantColumns = column.columns([
  column.accessor('fullName', {
    header: ({ column }) => <SortableHeader column={column}>Ім’я</SortableHeader>,
    sortFn: (a, b) => ukCollator.compare(a.original.fullName, b.original.fullName),
  }),
  column.accessor('phone', {
    header: 'Телефон',
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatPhone(getValue())}</span>,
    enableSorting: false,
  }),
  column.accessor((row) => row.currentApartment?.name ?? '', {
    id: 'apartment',
    header: 'Квартира',
    cell: ({ getValue }) => getValue() || '—',
    enableSorting: false,
  }),
  column.accessor('status', {
    header: 'Статус',
    cell: ({ getValue }) => <TenantStatusBadge status={getValue()} />,
    enableSorting: false,
  }),
]);
