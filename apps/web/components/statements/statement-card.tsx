import type { StatementListItem } from '@/lib/api/queries/statements';
import { formatPeriod } from '@/lib/format';
import { cn } from '@/lib/utils';
import { StatementAmount } from './statement-amount';
import { StatementStatusBadge } from './statement-status-badge';
import { StatementWarningsCount } from './statement-warnings-count';

// Mobile (< md) row of the statements list.
export function StatementCard({ statement }: { statement: StatementListItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span
          className={cn('font-medium', statement.status === 'CANCELLED' && 'text-muted-foreground')}
        >
          {formatPeriod(statement.period)}
        </span>
        <StatementStatusBadge status={statement.status} />
      </div>
      <div className="flex items-center justify-between gap-2">
        <StatementAmount statement={statement} />
        <StatementWarningsCount count={statement.warningsCount} />
      </div>
    </div>
  );
}
