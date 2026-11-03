// Server-side pagination for DataTable: the parent owns the page (e.g. in the URL) and fetches it.
export interface DataTableServerPagination {
  // 0-based (TanStack Table); APIs and URLs are usually 1-based.
  pageIndex: number;
  pageSize: number;
  // Total rows across all pages (from the API).
  rowCount: number;
  onPageIndexChange: (pageIndex: number) => void;
}
