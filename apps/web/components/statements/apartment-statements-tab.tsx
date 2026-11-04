'use client';

import { Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';
import { DataTable } from '@/components/data-table/data-table';
import { QueryError } from '@/components/query-error';
import { Button } from '@/components/ui/button';
import type { Apartment } from '@/lib/api/queries/apartments';
import {
  useStatements,
  type StatementListItem,
  type StatementPageSize,
} from '@/lib/api/queries/statements';
import { STATEMENT_PAGE_SIZES } from './constants/list';
import { useStatementsPagination } from './hooks/use-statements-pagination';
import { StatementCard } from './statement-card';
import { statementColumns } from './statement-columns';

// Module-level so DataTable's memo isn't invalidated on every render.
const statementRowId = (statement: StatementListItem) => statement.id;
const statementHref = (statement: StatementListItem) => `/statements/${statement.id}`;
const renderStatementCard = (statement: StatementListItem) => (
  <StatementCard statement={statement} />
);

// Apartment page, tab "Рахунки". Archived apartments can issue too: their last month still has to be billed.
export function ApartmentStatementsTab({ apartment }: { apartment: Apartment }) {
  const { page, pageSize, setPage, setPageSize } = useStatementsPagination();
  const statements = useStatements(apartment.id, page, pageSize);
  const newHref = `/apartments/${apartment.id}/statements/new`;

  // A page past the end (old link): go to the last page.
  const data = statements.data;
  useEffect(() => {
    if (data && data.items.length === 0 && data.total > 0) {
      setPage(Math.ceil(data.total / data.pageSize));
    }
  }, [data, setPage]);

  return (
    <div className="space-y-4">
      <Button asChild className="w-full sm:w-auto">
        <Link href={newHref}>
          <Plus />
          Новий рахунок
        </Link>
      </Button>
      {statements.isError ? (
        <QueryError error={statements.error} onRetry={() => void statements.refetch()} />
      ) : (
        <div className={statements.isPlaceholderData ? 'opacity-60 transition-opacity' : undefined}>
          <DataTable
            columns={statementColumns}
            data={data?.items}
            isLoading={statements.isPending}
            getRowId={statementRowId}
            getRowHref={statementHref}
            renderCard={renderStatementCard}
            pagination={
              data && {
                pageIndex: page - 1,
                pageSize,
                rowCount: data.total,
                onPageIndexChange: (pageIndex) => setPage(pageIndex + 1),
              }
            }
            pageSize={pageSize}
            pageSizeOptions={STATEMENT_PAGE_SIZES}
            // The select only offers STATEMENT_PAGE_SIZES.
            onPageSizeChange={(size) => setPageSize(size as StatementPageSize)}
            empty={<p>Рахунків ще немає</p>}
          />
        </div>
      )}
    </div>
  );
}
