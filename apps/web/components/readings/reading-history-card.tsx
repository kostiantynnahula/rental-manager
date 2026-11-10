import type { ReadingHistoryItem } from '@/lib/api/queries/readings';
import { formatDate, formatPeriod } from '@/lib/format';
import { formatHistoryValues } from './helpers/format-history-values';
import { HistoryMeterName } from './history-meter-name';
import { HistoryPhotoLinks } from './history-photo-links';

// Mobile (< md) row of the readings history.
export function ReadingHistoryCard({ item }: { item: ReadingHistoryItem }) {
  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2">
        <HistoryMeterName item={item} />
        <span className="shrink-0 text-sm whitespace-nowrap">{formatPeriod(item.period)}</span>
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
        <dt className="text-muted-foreground">Показники</dt>
        <dd className="flex items-center gap-1 tabular-nums">
          {formatHistoryValues(item, 'value')}
          <HistoryPhotoLinks item={item} />
        </dd>
        <dt className="text-muted-foreground">Споживання</dt>
        <dd className="tabular-nums">{formatHistoryValues(item, 'consumption')}</dd>
        <dt className="text-muted-foreground">Подано</dt>
        <dd>
          {formatDate(item.readingDate)}
          {item.meter.serialNumber && (
            <span className="text-muted-foreground"> · № {item.meter.serialNumber}</span>
          )}
        </dd>
      </dl>
    </div>
  );
}
