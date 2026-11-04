import type { StatementLine } from '@/lib/api/queries/statements';
import { formatMoney } from '@/lib/format';
import { StatementLineRow } from './statement-line-row';

// Lines in the API's order, then the total. Used for both the preview and a saved statement.
export function StatementLines({ lines, total }: { lines: StatementLine[]; total: number }) {
  return (
    <div className="rounded-lg border bg-card px-4">
      {lines.length === 0 ? (
        <p className="py-6 text-center text-muted-foreground">Немає рядків</p>
      ) : (
        <ul className="divide-y">
          {lines.map((line) => (
            // A tariff has one line per zone; rent has neither.
            <StatementLineRow
              key={`${line.type}-${line.tariffId ?? ''}-${line.zone ?? ''}`}
              line={line}
            />
          ))}
        </ul>
      )}
      <div className="flex items-baseline justify-between gap-3 border-t py-4">
        <span className="font-medium">До сплати</span>
        <span className="text-2xl font-semibold whitespace-nowrap tabular-nums">
          {formatMoney(total)}
        </span>
      </div>
    </div>
  );
}
