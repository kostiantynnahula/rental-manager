'use client';

import { createDataTableColumnHelper } from '@/components/data-table/features';
import type { StatementListItem } from '@/lib/api/queries/statements';
import { formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatementAmount } from './statement-amount';
import { StatementStatusBadge } from './statement-status-badge';
import { StatementWarningsCount } from './statement-warnings-count';

const column = createDataTableColumnHelper<StatementListItem>();

// Module-level: DataTable needs stable column definitions. The order comes from the API (server-side
// pagination), so no column is sortable.
export const statementColumns = column.columns([
  column.display({
    id: 'period',
    header: 'Місяць',
    cell: ({ row }) => (
      <span
        className={cn(
          'whitespace-nowrap',
          row.original.status === 'CANCELLED' && 'text-muted-foreground',
        )}
      >
        {formatPeriod(row.original.period)}
      </span>
    ),
  }),
  column.display({
    id: 'status',
    header: 'Статус',
    cell: ({ row }) => <StatementStatusBadge status={row.original.status} />,
  }),
  column.display({
    id: 'total',
    header: 'Сума',
    cell: ({ row }) => <StatementAmount statement={row.original} />,
  }),
  column.display({
    id: 'warnings',
    header: 'Попередження',
    cell: ({ row }) => <StatementWarningsCount count={row.original.warningsCount} />,
  }),
]);
