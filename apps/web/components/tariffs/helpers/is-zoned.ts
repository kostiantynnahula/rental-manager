import type { Tariff } from '@/lib/api/queries/tariffs';

// Same rule as the API: DAY/NIGHT prices only for a METERED electricity tariff.
export function isZoned(tariff: Pick<Tariff, 'kind' | 'utilities'>): boolean {
  return (
    tariff.kind === 'METERED' &&
    tariff.utilities.length === 1 &&
    tariff.utilities[0] === 'ELECTRICITY'
  );
}
