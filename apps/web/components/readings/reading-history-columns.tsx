'use client';

import { createDataTableColumnHelper } from '@/components/data-table/features';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { formatDate, formatPeriod } from '@/lib/format';
import { formatHistoryValues } from './helpers/format-history-values';
import { HistoryConsumption } from './history-consumption';
import { HistoryMeterName } from './history-meter-name';
import { HistoryPhotoLinks } from './history-photo-links';

const column = createDataTableColumnHelper<ReadingHistoryItem>();

// Module-level: DataTable needs stable column definitions. The order comes from the API (server-side
// pagination), so no column is sortable.
export const readingHistoryColumns = column.columns([
  column.display({
    id: 'meter',
    header: 'Лічильник',
    cell: ({ row }) => <HistoryMeterName item={row.original} />,
  }),
  column.accessor((row) => row.meter.serialNumber ?? '', {
    id: 'serialNumber',
    header: 'Номер',
    cell: ({ getValue }) => getValue() || '—',
    enableSorting: false,
  }),
  column.accessor('period', {
    header: 'Період',
    cell: ({ getValue }) => <span className="whitespace-nowrap">{formatPeriod(getValue())}</span>,
    enableSorting: false,
  }),
  column.accessor('readingDate', {
    header: 'Дата подачі',
    cell: ({ getValue }) => formatDate(getValue()),
    enableSorting: false,
  }),
  column.display({
    id: 'values',
    header: 'Показники',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
        {formatHistoryValues(row.original, 'value')}
        <HistoryPhotoLinks item={row.original} />
      </span>
    ),
  }),
  column.display({
    id: 'consumption',
    header: 'Споживання',
    cell: ({ row }) => <HistoryConsumption item={row.original} />,
  }),
]);
