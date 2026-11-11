import type { StatementPreview } from '@/lib/api/queries/statements';
import type { ManualTariff } from '../interfaces/manual-tariff';

// The month's active MANUAL tariffs, straight from the preview: a MANUAL line once an amount is entered,
// a MISSING_MANUAL_AMOUNT warning before that. By name, like the API's line order.
export function manualTariffsOf(preview: StatementPreview): ManualTariff[] {
  const fromLines = preview.lines.flatMap((l) =>
    l.type === 'MANUAL' && l.tariffId ? [{ tariffId: l.tariffId, name: l.name }] : [],
  );
  const fromWarnings = preview.warnings.flatMap((w) =>
    w.code === 'MISSING_MANUAL_AMOUNT' && w.tariffId
      ? [{ tariffId: w.tariffId, name: w.tariffName ?? '' }]
      : [],
  );
  return [...fromLines, ...fromWarnings].sort((a, b) => a.name.localeCompare(b.name, 'uk'));
}
