'use client';

import { useTable, type ColumnDef, type RowData, type SortingState } from '@tanstack/react-table';
import Link from 'next/link';
import { useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableSkeleton } from './data-table-skeleton';
import { dataTableFeatures, type DataTableFeatures } from './features';

interface DataTableProps<TData extends RowData> {
  // Stable references (module-level or useMemo): a new array each render recomputes the table.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- columns have different value types
  columns: ColumnDef<DataTableFeatures, TData, any>[];
  data: TData[] | undefined;
  isLoading?: boolean;
  getRowId: (row: TData) => string;
  getRowHref: (row: TData) => string;
  // Mobile (< md) view of one row; the whole card is a link to getRowHref.
  renderCard: (row: TData) => React.ReactNode;
  // Client-side text search: rows whose getSearchText() contains `search` (case-insensitive).
  search?: string;
  getSearchText?: (row: TData) => string;
  initialSorting?: SortingState;
  empty: React.ReactNode;
}

const NO_ROWS: never[] = [];

function normalize(text: string): string {
  return text.toLocaleLowerCase('uk').trim();
}

export function DataTable<TData extends RowData>({
  columns,
  data,
  isLoading = false,
  getRowId,
  getRowHref,
  renderCard,
  search = '',
  getSearchText,
  initialSorting = NO_ROWS,
  empty,
}: DataTableProps<TData>) {
  const rows = useMemo(() => {
    const all = data ?? NO_ROWS;
    const query = normalize(search);
    if (!query || !getSearchText) return all;
    return all.filter((row) => normalize(getSearchText(row)).includes(query));
  }, [data, search, getSearchText]);

  const table = useTable({
    features: dataTableFeatures,
    columns,
    data: rows,
    getRowId: (row) => getRowId(row),
    initialState: { sorting: initialSorting },
  });

  if (isLoading) return <DataTableSkeleton columns={columns.length} />;

  const tableRows = table.getRowModel().rows;
  if (tableRows.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-10 text-center text-muted-foreground">
        {empty}
      </div>
    );
  }

  return (
    <>
      {/* Mobile: card list built from the same (sorted, filtered) rows. */}
      <ul className="space-y-2 md:hidden">
        {tableRows.map((row) => (
          <li key={row.id}>
            <Link
              href={getRowHref(row.original)}
              className="block min-h-11 rounded-lg border bg-card p-4 transition-colors active:bg-muted"
            >
              {renderCard(row.original)}
            </Link>
          </li>
        ))}
      </ul>

      <div className="hidden rounded-lg border md:block">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((group) => (
              <TableRow key={group.id}>
                {group.headers.map((header) => {
                  const sorted = header.column.getIsSorted();
                  return (
                    <TableHead
                      key={header.id}
                      aria-sort={
                        sorted === 'asc'
                          ? 'ascending'
                          : sorted === 'desc'
                            ? 'descending'
                            : undefined
                      }
                    >
                      {header.isPlaceholder ? null : <table.FlexRender header={header} />}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {tableRows.map((row) => (
              // `relative` + the first cell's stretched link (after:inset-0) make the whole row clickable,
              // while it stays a real link (keyboard, middle-click, "open in new tab").
              <TableRow key={row.id} className="relative cursor-pointer">
                {row.getAllCells().map((cell, index) => (
                  <TableCell key={cell.id}>
                    {index === 0 ? (
                      <Link
                        href={getRowHref(row.original)}
                        className="font-medium outline-none after:absolute after:inset-0 focus-visible:underline"
                      >
                        <table.FlexRender cell={cell} />
                      </Link>
                    ) : (
                      <table.FlexRender cell={cell} />
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </>
  );
}
