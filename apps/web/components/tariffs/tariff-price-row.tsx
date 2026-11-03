'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { MeterActionItem } from '@/components/meters/meter-action-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { TariffDetail, TariffPrice } from '@/lib/api/queries/tariffs';
import { formatPeriod } from '@/lib/format';
import { formatPrice } from '@/lib/tariff-prices';
import { ZONE_LABELS } from '@/lib/utilities';
import { ARCHIVED_REASON } from './constants/labels';
import { DeleteTariffPriceDialog } from './delete-tariff-price-dialog';
import { isZoned } from './helpers/is-zoned';
import { priceUnit } from './helpers/price-unit';
import { TariffPriceSheet } from './tariff-price-sheet';

type Panel = 'fix' | 'delete' | null;

interface TariffPriceRowProps {
  tariff: TariffDetail;
  price: TariffPrice;
  // In effect this month (one of currentPrices).
  current: boolean;
  // Starts after this month.
  upcoming: boolean;
}

export function TariffPriceRow({ tariff, price, current, upcoming }: TariffPriceRowProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = (open: boolean) => !open && setPanel(null);
  const amount = `${formatPrice(price.price)} ${priceUnit(tariff)}`;

  return (
    <li className="flex items-center gap-3 rounded-lg border p-3">
      <div className="min-w-0 flex-1 space-y-0.5">
        <p className="flex flex-wrap items-center gap-2 font-medium tabular-nums">
          {amount}
          {current && <Badge>Діє</Badge>}
          {upcoming && <Badge variant="outline">Заплановано</Badge>}
        </p>
        <p className="text-sm text-muted-foreground">
          Діє з: {formatPeriod(price.effectiveFrom)}
          {isZoned(tariff) && ` · ${ZONE_LABELS[price.zone]}`}
        </p>
      </div>

      {/* Non-modal: a Sheet/Dialog opened from an item would otherwise fight the menu over focus. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Дії: ${amount}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <MeterActionItem
            icon={<Pencil />}
            label="Виправити"
            disabledReason={tariff.isActive ? null : ARCHIVED_REASON}
            onSelect={() => setPanel('fix')}
          />
          <MeterActionItem
            icon={<Trash2 />}
            label="Видалити"
            disabledReason={null}
            onSelect={() => setPanel('delete')}
            destructive
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <TariffPriceSheet tariff={tariff} price={price} open={panel === 'fix'} onOpenChange={close} />
      <DeleteTariffPriceDialog
        tariff={tariff}
        price={price}
        open={panel === 'delete'}
        onOpenChange={close}
      />
    </li>
  );
}
