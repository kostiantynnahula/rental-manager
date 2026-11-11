import { ChevronRight } from 'lucide-react';
import { PhotoLinkButton } from '@/components/photos/photo-link-button';
import type { StatementLine } from '@/lib/api/queries/statements';
import { formatMoney } from '@/lib/format';
import { formatMeterValueCompact } from '@/lib/meter-values';
import { statementMeterName } from '@/lib/statements';
import { formatPrice } from '@/lib/tariff-prices';
import { UTILITY_UNITS, ZONE_LABELS } from '@/lib/utilities';

// One bill line. Only METERED lines show the calculation and their meters: rent and fixed fees are just an amount.
export function StatementLineRow({ line }: { line: StatementLine }) {
  // All utilities of one tariff share a unit (drainage = cold + hot water, both m³).
  const unit = line.utilities?.[0] ? UTILITY_UNITS[line.utilities[0]] : undefined;
  const meters = line.meters ?? [];

  return (
    <li className="py-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium break-words">
            {line.name}
            {/* TOTAL says nothing on a single-zone line. */}
            {line.zone && line.zone !== 'TOTAL' && (
              <span className="font-normal text-muted-foreground"> · {ZONE_LABELS[line.zone]}</span>
            )}
          </p>
          {line.type === 'METERED' && line.quantity && line.unitPrice && (
            <p className="text-sm text-muted-foreground tabular-nums">
              {formatMeterValueCompact(line.quantity)} {unit} × {formatPrice(line.unitPrice)} грн
            </p>
          )}
        </div>
        <span className="shrink-0 font-medium whitespace-nowrap tabular-nums">
          {formatMoney(line.amount)}
        </span>
      </div>
      {meters.length > 0 && (
        <details className="group">
          <summary className="flex min-h-11 cursor-pointer list-none items-center gap-1 text-sm text-muted-foreground md:min-h-8 [&::-webkit-details-marker]:hidden">
            <ChevronRight
              className="size-4 transition-transform group-open:rotate-90"
              aria-hidden
            />
            Лічильники ({meters.length})
          </summary>
          <ul className="space-y-1 pb-1 pl-5 text-sm">
            {meters.map((meter) => (
              <li key={meter.meterId} className="flex items-start justify-between gap-3">
                <span className="min-w-0 break-words">
                  {statementMeterName(meter.utility, meter.label)}
                  {meter.serialNumber && (
                    <span className="text-muted-foreground"> · № {meter.serialNumber}</span>
                  )}
                </span>
                <span className="inline-flex shrink-0 items-center gap-1 whitespace-nowrap tabular-nums">
                  {meter.photoIds.map((photoId) => (
                    <PhotoLinkButton
                      key={photoId}
                      photoId={photoId}
                      label={statementMeterName(meter.utility, meter.label)}
                    />
                  ))}
                  {formatMeterValueCompact(meter.consumption)} {UTILITY_UNITS[meter.utility]}
                </span>
              </li>
            ))}
          </ul>
        </details>
      )}
    </li>
  );
}
