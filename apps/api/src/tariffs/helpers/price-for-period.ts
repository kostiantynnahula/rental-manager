import { Zone } from '../../generated/prisma/enums.js';
import type { TariffPriceRow } from '../interfaces/tariff-price-row.interface.js';

// The zone's own price for a period: the latest effectiveFrom <= period (undefined if none yet).
function ownPrice<T extends TariffPriceRow>(prices: T[], period: Date, zone: Zone): T | undefined {
  let latest: T | undefined;
  for (const p of prices) {
    if (p.zone !== zone || p.effectiveFrom > period) continue;
    if (!latest || p.effectiveFrom > latest.effectiveFrom) latest = p;
  }
  return latest;
}

// The price billed for a zone in a period: its own price, falling back to TOTAL (a two-zone
// meter only needs an extra NIGHT price; DAY usually equals TOTAL).
export function priceForPeriod<T extends TariffPriceRow>(
  prices: T[],
  period: Date,
  zone: Zone,
): T | undefined {
  return (
    ownPrice(prices, period, zone) ??
    (zone === Zone.TOTAL ? undefined : ownPrice(prices, period, Zone.TOTAL))
  );
}

// Prices in effect for a period, one per zone that has its own price (zone enum order).
export function currentPrices<T extends TariffPriceRow>(prices: T[], period: Date): T[] {
  return Object.values(Zone)
    .map((zone) => ownPrice(prices, period, zone))
    .filter((p): p is T => p !== undefined);
}
