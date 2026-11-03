import {
  createColumnHelper,
  createSortedRowModel,
  rowPaginationFeature,
  rowSortingFeature,
  tableFeatures,
  type RowData,
} from '@tanstack/react-table';

// TanStack Table v9: features are opt-in and must be a stable (module-level) object.
// Text search is done before the table (see DataTable). Pagination is server-side only (manualPagination): no
// paginatedRowModel is registered, so tables without the `pagination` prop are never sliced.
export const dataTableFeatures = tableFeatures({
  rowSortingFeature,
  rowPaginationFeature,
  sortedRowModel: createSortedRowModel(),
});

export type DataTableFeatures = typeof dataTableFeatures;

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>();
}

// Ukrainian-aware, case-insensitive text order (є, і, ї, ґ in the right place).
export const ukCollator = new Intl.Collator('uk', { sensitivity: 'base', numeric: true });
