'use client';

import type { CellData, Column, RowData } from '@tanstack/react-table';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { DataTableFeatures } from './features';

export function SortableHeader<TData extends RowData, TValue extends CellData>({
  column,
  children,
}: {
  column: Column<DataTableFeatures, TData, TValue>;
  children: React.ReactNode;
}) {
  const sorted = column.getIsSorted();
  const Icon = sorted === 'asc' ? ArrowUp : sorted === 'desc' ? ArrowDown : ArrowUpDown;
  return (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-2.5"
      onClick={column.getToggleSortingHandler()}
    >
      {children}
      <Icon className={sorted ? undefined : 'opacity-40'} />
    </Button>
  );
}
