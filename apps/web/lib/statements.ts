// Statement labels and messages, for the apartment tab, the new statement page and the statement page.
import { ApiError } from '@/lib/api/errors';
import type { StatementStatus, StatementWarning } from '@/lib/api/queries/statements';
import { UTILITY_LABELS, ZONE_LABELS, type UtilityType } from '@/lib/utilities';

export const STATEMENT_STATUS_LABELS: Record<StatementStatus, string> = {
  ISSUED: 'Виставлено',
  CANCELLED: 'Скасовано',
};

// "Холодна вода кухня"
export function statementMeterName(utility: UtilityType, label?: string | null): string {
  return label ? `${UTILITY_LABELS[utility]} ${label}` : UTILITY_LABELS[utility];
}

export function statementWarningMessage(warning: StatementWarning): string {
  const tariff = `«${warning.tariffName ?? ''}»`;
  switch (warning.code) {
    case 'MISSING_READING':
      return warning.utility
        ? `Не внесено показання: ${statementMeterName(warning.utility, warning.label)}`
        : 'Не внесено показання';
    case 'NO_PRICE': {
      const zone =
        warning.zone && warning.zone !== 'TOTAL' ? ` (${ZONE_LABELS[warning.zone]})` : '';
      return `Немає ціни для ${tariff}${zone}: рядок не включено`;
    }
    case 'NO_METERS':
      return `Немає лічильників для ${tariff}: рядок не включено`;
    case 'MULTIPLE_LEASES':
      return 'У цьому місяці кілька договорів: оренду не включено';
  }
}

// The two 409s of issuing: a changed total carries the fresh `preview`, "already issued" doesn't.
export function isStatementTotalChanged(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.status === 409 &&
    typeof error.body === 'object' &&
    error.body !== null &&
    'preview' in error.body
  );
}
