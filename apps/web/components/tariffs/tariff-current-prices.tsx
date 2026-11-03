import type { Tariff } from '@/lib/api/queries/tariffs';
import { formatPrice } from '@/lib/tariff-prices';
import { ZONE_LABELS } from '@/lib/utilities';
import { priceUnit } from './helpers/price-unit';

// Prices in effect this month, one line per zone: "4,32 грн/кВт·год", "Ніч: 2,16 грн/кВт·год".
export function TariffCurrentPrices({ tariff }: { tariff: Tariff }) {
  if (tariff.currentPrices.length === 0) {
    return <span className="text-muted-foreground">—</span>;
  }
  const unit = priceUnit(tariff);
  return (
    <span className="flex flex-col tabular-nums">
      {tariff.currentPrices.map((price) => (
        <span key={price.id} className="whitespace-nowrap">
          {price.zone !== 'TOTAL' && `${ZONE_LABELS[price.zone]}: `}
          {/* Non-breaking space: the amount never wraps away from its unit. */}
          {`${formatPrice(price.price)} ${unit}`}
        </span>
      ))}
    </span>
  );
}
