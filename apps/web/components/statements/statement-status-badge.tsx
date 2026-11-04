import { Badge } from '@/components/ui/badge';
import type { StatementStatus } from '@/lib/api/queries/statements';
import { STATEMENT_STATUS_LABELS } from '@/lib/statements';

export function StatementStatusBadge({ status }: { status: StatementStatus }) {
  return (
    <Badge variant={status === 'ISSUED' ? 'default' : 'outline'}>
      {STATEMENT_STATUS_LABELS[status]}
    </Badge>
  );
}
