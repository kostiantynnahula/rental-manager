import type { StatementListItem } from '@/lib/api/queries/statements';
import { formatMoney } from '@/lib/format';
import { cn } from '@/lib/utils';

// A list row's total; a cancelled statement's is crossed out: it isn't owed.
export function StatementAmount({ statement }: { statement: StatementListItem }) {
  return (
    <span
      className={cn(
        'whitespace-nowrap tabular-nums',
        statement.status === 'CANCELLED' && 'text-muted-foreground line-through',
      )}
    >
      {formatMoney(statement.totalAmount)}
    </span>
  );
}
