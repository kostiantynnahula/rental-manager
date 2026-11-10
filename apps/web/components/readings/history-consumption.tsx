import { TriangleAlert } from 'lucide-react';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { consumptionWarningText } from '@/lib/consumption';
import { ZONE_LABELS } from '@/lib/utilities';
import { formatHistoryValues } from './helpers/format-history-values';

// "День: Більше за звичні 130/міс." — one line per warning of the reading's values (zone only for DAY/NIGHT).
function historyWarnings(item: ReadingHistoryItem): string[] {
  return item.values.flatMap((v) =>
    v.warnings.map((reason) => {
      const text = consumptionWarningText(item.meter.utility, v.zone, reason);
      return v.zone === 'TOTAL' ? text : `${ZONE_LABELS[v.zone]}: ${text}`;
    }),
  );
}

interface HistoryConsumptionProps {
  item: ReadingHistoryItem;
  // Mobile card: the texts under the value too (a phone has no tooltips).
  showTexts?: boolean;
}

// Consumption of a history row, with ⚠ when the shared rule flags it (above the usual limit, zero with a lease).
export function HistoryConsumption({ item, showTexts }: HistoryConsumptionProps) {
  const warnings = historyWarnings(item);
  const label = warnings.join('; ');
  return (
    <span className="inline-flex flex-col gap-0.5">
      <span className="inline-flex items-center gap-1 whitespace-nowrap tabular-nums">
        {formatHistoryValues(item, 'consumption')}
        {warnings.length > 0 && (
          <TriangleAlert
            className="size-4 shrink-0 text-amber-600 dark:text-amber-400"
            role="img"
            aria-label={label}
          >
            <title>{label}</title>
          </TriangleAlert>
        )}
      </span>
      {showTexts && warnings.length > 0 && (
        <span className="text-xs text-amber-700 dark:text-amber-400">{label}</span>
      )}
    </span>
  );
}
