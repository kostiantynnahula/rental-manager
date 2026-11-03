'use client';

import { ArchivedBadge } from '@/components/apartments/archived-badge';
import { createDataTableColumnHelper } from '@/components/data-table/features';
import type { Tariff } from '@/lib/api/queries/tariffs';
import { TARIFF_KIND_LABELS } from './constants/labels';
import { tariffUtilitiesLabel } from './helpers/tariff-utilities-label';
import { TariffCurrentPrices } from './tariff-current-prices';

const column = createDataTableColumnHelper<Tariff>();

// Module-level: DataTable needs stable column definitions. The order comes from the API (server-side
// pagination), so no column is sortable.
export const tariffColumns = column.columns([
  column.accessor('name', {
    header: 'Назва',
    cell: ({ row }) => (
      <span className="inline-flex items-center gap-2">
        {row.original.name}
        {!row.original.isActive && <ArchivedBadge />}
      </span>
    ),
    enableSorting: false,
  }),
  column.accessor('kind', {
    header: 'Тип',
    cell: ({ getValue }) => TARIFF_KIND_LABELS[getValue()],
    enableSorting: false,
  }),
  column.accessor((row) => tariffUtilitiesLabel(row.utilities), {
    id: 'utilities',
    header: 'Послуга',
    enableSorting: false,
  }),
  column.display({
    id: 'price',
    header: 'Поточна ціна',
    cell: ({ row }) => <TariffCurrentPrices tariff={row.original} />,
  }),
]);
