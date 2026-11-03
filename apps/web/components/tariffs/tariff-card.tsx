import { ArchivedBadge } from '@/components/apartments/archived-badge';
import type { Tariff } from '@/lib/api/queries/tariffs';
import { TARIFF_KIND_LABELS } from './constants/labels';
import { tariffUtilitiesLabel } from './helpers/tariff-utilities-label';
import { TariffCurrentPrices } from './tariff-current-prices';

// Mobile (< md) row of the tariffs list.
export function TariffCard({ tariff }: { tariff: Tariff }) {
  return (
    <div className="space-y-1">
      <div className="flex items-start justify-between gap-2">
        <span className="font-medium">{tariff.name}</span>
        {!tariff.isActive && <ArchivedBadge />}
      </div>
      <p className="text-sm text-muted-foreground">
        {TARIFF_KIND_LABELS[tariff.kind]}
        {tariff.kind === 'METERED' && ` · ${tariffUtilitiesLabel(tariff.utilities)}`}
      </p>
      <p className="text-sm">
        <TariffCurrentPrices tariff={tariff} />
      </p>
    </div>
  );
}
