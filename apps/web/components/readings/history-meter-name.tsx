import { meterTitle } from '@/components/meters/helpers/meter-title';
import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { READING_KIND_NOTES } from './constants/history';

// "Електроенергія · кухня" + muted "знятий" / "встановлення" / "зняття" notes.
export function HistoryMeterName({ item }: { item: ReadingHistoryItem }) {
  const kindNote =
    item.kind === 'INITIAL' || item.kind === 'FINAL' ? READING_KIND_NOTES[item.kind] : null;
  return (
    <span>
      <span className="font-medium">{meterTitle(item.meter)}</span>
      {kindNote && <span className="text-xs text-muted-foreground"> · {kindNote}</span>}
      {item.meter.removed && <span className="text-xs text-muted-foreground"> · знятий</span>}
    </span>
  );
}
