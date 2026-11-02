'use client';

import { createDataTableColumnHelper } from '@/components/data-table/features';
import { SortableHeader } from '@/components/data-table/sortable-header';
import type { Lease } from '@/lib/api/queries/leases';
import { todayDateOnly, formatMoney } from '@/lib/format';
import { formatLeaseTerm, leaseStatus, primaryTenant } from '@/lib/leases';
import { LeaseStatusBadge } from './lease-status-badge';

const column = createDataTableColumnHelper<Lease>();

// Module-level: DataTable needs stable column definitions.
export const leaseColumns = column.columns([
  // Sorted by start date ("YYYY-MM-DD" sorts as a string).
  column.accessor('startDate', {
    id: 'term',
    header: ({ column }) => <SortableHeader column={column}>Термін</SortableHeader>,
    cell: ({ row }) => formatLeaseTerm(row.original.startDate, row.original.endDate),
    sortFn: (a, b) => a.original.startDate.localeCompare(b.original.startDate),
  }),
  column.accessor((row) => primaryTenant(row)?.fullName ?? '', {
    id: 'primary',
    header: 'Основний орендар',
    cell: ({ getValue }) => getValue() || '—',
    enableSorting: false,
  }),
  column.accessor('monthlyRent', {
    header: 'Оренда',
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatMoney(getValue())}</span>,
    enableSorting: false,
  }),
  column.display({
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => <LeaseStatusBadge status={leaseStatus(row.original, todayDateOnly())} />,
  }),
]);
