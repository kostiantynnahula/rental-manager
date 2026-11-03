'use client';

import type { ReactTable, RowData } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { NativeSelect } from '@/components/native-select';
import { Button } from '@/components/ui/button';
import type { DataTableFeatures } from './features';

interface DataTablePaginationProps<TData extends RowData> {
  table: ReactTable<DataTableFeatures, TData>;
  pageSize?: number;
  pageSizeOptions?: readonly number[];
  onPageSizeChange?: (pageSize: number) => void;
}

// "21–40 з 57 · Сторінка 2 з 3" + previous/next (44px touch targets on mobile).
export function DataTablePagination<TData extends RowData>({
  table,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
}: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize: currentPageSize } = table.state.pagination;
  const rowCount = table.getRowCount();
  const pageCount = Math.max(table.getPageCount(), 1);
  const first = rowCount === 0 ? 0 : pageIndex * currentPageSize + 1;
  const last = Math.min((pageIndex + 1) * currentPageSize, rowCount);

  return (
    <nav
      aria-label="Сторінки"
      className="flex items-center justify-between gap-3 pt-3 text-sm text-muted-foreground"
    >
      <div className="flex items-center gap-3">
        {pageSizeOptions && onPageSizeChange && (
          <NativeSelect
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            aria-label="На сторінці"
            className="w-20"
          >
            {pageSizeOptions.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </NativeSelect>
        )}
        <p>
          {first}–{last} з {rowCount}
          <span className="hidden sm:inline">
            {' '}
            · Сторінка {pageIndex + 1} з {pageCount}
          </span>
        </p>
      </div>
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
