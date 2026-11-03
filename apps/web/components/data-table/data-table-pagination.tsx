'use client';

import type { ReactTable, RowData } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DataTableFeatures } from './features';

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
}

// "21–40 з 57 · Сторінка 2 з 3" + previous/next (44px touch targets on mobile).
export function DataTablePagination<TData extends RowData>({
  table,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.state.pagination;
  const rowCount = table.getRowCount();
  const pageCount = Math.max(table.getPageCount(), 1);
  const first = rowCount === 0 ? 0 : pageIndex * pageSize + 1;
  const last = Math.min((pageIndex + 1) * pageSize, rowCount);

  return (
    <nav
      aria-label="Сторінки"
      className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground"
    >
      <p>
        {first}–{last} з {rowCount}
        <span className="hidden sm:inline">
          {' '}
          · Сторінка {pageIndex + 1} з {pageCount}
        </span>
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          aria-label="Попередня сторінка"
        >
          <ChevronLeft />
        </Button>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          aria-label="Наступна сторінка"
        >
          <ChevronRight />
        </Button>
      </div>
    </nav>
  );
}
