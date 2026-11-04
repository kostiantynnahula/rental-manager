'use client';

import { useParams } from 'next/navigation';
import { FormSkeleton } from '@/components/form-skeleton';
import { NotFoundState } from '@/components/not-found-state';
import { QueryError } from '@/components/query-error';
import { isNotFoundError } from '@/lib/api/api-error';
import { useStatement } from '@/lib/api/queries/statements';
import { StatementDetailView } from './statement-detail-view';

// /statements/[id]
export function StatementDetail() {
  const { id } = useParams<{ id: string }>();
  const statement = useStatement(id);

  if (statement.isPending) return <FormSkeleton fields={3} />;
  if (statement.isError) {
    return isNotFoundError(statement.error) ? (
      <NotFoundState title="Рахунок не знайдено" backHref="/" backLabel="До списку квартир" />
    ) : (
      <QueryError error={statement.error} onRetry={() => void statement.refetch()} />
    );
  }
  return <StatementDetailView statement={statement.data} />;
}
