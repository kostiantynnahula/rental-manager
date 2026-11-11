'use client';

import { ArchiveRestore, MoreVertical, PencilLine, PlugZap, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ArchivedBadge } from '@/components/apartments/archived-badge';
import { MeterActionItem } from '@/components/meters/meter-action-item';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { applyApiError } from '@/lib/api/api-error';
import type { Apartment } from '@/lib/api/queries/apartments';
import { useEndApartmentTariff, type ApartmentTariff } from '@/lib/api/queries/apartment-tariffs';
import { formatPeriod, todayDateOnly } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  APARTMENT_ARCHIVED_REASON,
  ARCHIVED_REASON,
  ENDED_REASON,
  TARIFF_KIND_LABELS,
} from './constants/labels';
import { ApartmentTariffPriceSheet } from './apartment-tariff-price-sheet';
import { DeleteApartmentTariffDialog } from './delete-apartment-tariff-dialog';
import { EndApartmentTariffSheet } from './end-apartment-tariff-sheet';
import { tariffUtilitiesLabel } from './helpers/tariff-utilities-label';
import { TariffCurrentPrices } from './tariff-current-prices';

type Panel = 'price' | 'end' | 'delete' | null;

interface ApartmentTariffCardProps {
  apartment: Apartment;
  attachment: ApartmentTariff;
}

// One tariff on the apartment's "Тарифи" tab: what it bills, its price now and the months it applies to.
export function ApartmentTariffCard({ apartment, attachment }: ApartmentTariffCardProps) {
  const [panel, setPanel] = useState<Panel>(null);
  const close = (open: boolean) => !open && setPanel(null);
  const reopen = useEndApartmentTariff(apartment.id);
  const { tariff } = attachment;
  const upcoming = attachment.activeFrom > todayDateOnly().slice(0, 7);
  const priceReason = !apartment.isActive
    ? APARTMENT_ARCHIVED_REASON
    : !tariff.isActive
      ? ARCHIVED_REASON
      : !attachment.isCurrent
        ? ENDED_REASON
        : null;

  function restore() {
    reopen.mutate(
      { id: attachment.id, activeTo: null },
      {
        onSuccess: () => toast.success('Тариф знову діє'),
        onError: (error) =>
          applyApiError(error, {
            messages: { 409: 'Не можна відновити: цей тариф уже підключено на пізніші місяці' },
          }),
      },
    );
  }

  return (
    <article
      className={cn(
        'flex items-start gap-3 rounded-lg border p-3',
        !attachment.isCurrent && 'opacity-70',
      )}
    >
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/tariffs/${tariff.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {tariff.name}
          </Link>
          {!tariff.isActive && <ArchivedBadge />}
          {!attachment.isCurrent && <Badge variant="secondary">Завершено</Badge>}
          {attachment.isCurrent && upcoming && <Badge variant="outline">Заплановано</Badge>}
          {tariff.apartmentCount > 1 && (
            <Badge variant="outline">Спільний · {tariff.apartmentCount} кв.</Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          {TARIFF_KIND_LABELS[tariff.kind]}
          {tariff.kind === 'METERED' && ` · ${tariffUtilitiesLabel(tariff.utilities)}`}
        </p>
        <div className="text-sm">
          <TariffCurrentPrices tariff={tariff} />
        </div>
        <p className="text-sm text-muted-foreground">
          з {formatPeriod(attachment.activeFrom)}
          {attachment.activeTo && ` по ${formatPeriod(attachment.activeTo)}`}
        </p>
      </div>

      {/* Non-modal: a Sheet/Dialog opened from an item would otherwise fight the menu over focus. */}
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" aria-label={`Дії: ${tariff.name}`}>
            <MoreVertical />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-64">
          {/* MANUAL has no price: its amount is entered in each statement. */}
          {tariff.kind !== 'MANUAL' && (
            <MeterActionItem
              icon={<PencilLine />}
              label="Змінити ціну"
              disabledReason={priceReason}
              onSelect={() => setPanel('price')}
            />
          )}
          {attachment.isCurrent ? (
            <MeterActionItem
              icon={<PlugZap />}
              label={attachment.activeTo ? 'Змінити останній місяць' : 'Відключити'}
              disabledReason={null}
              onSelect={() => setPanel('end')}
            />
          ) : (
            <MeterActionItem
              icon={<ArchiveRestore />}
              label="Відновити"
              disabledReason={reopen.isPending ? 'Збереження…' : null}
              onSelect={restore}
            />
          )}
          <DropdownMenuSeparator />
          <MeterActionItem
            icon={<Trash2 />}
            label="Видалити (помилково)"
            disabledReason={null}
            onSelect={() => setPanel('delete')}
            destructive
          />
        </DropdownMenuContent>
      </DropdownMenu>

      <ApartmentTariffPriceSheet
        apartment={apartment}
        attachment={attachment}
        open={panel === 'price'}
        onOpenChange={close}
      />
      <EndApartmentTariffSheet
        apartmentId={apartment.id}
        attachment={attachment}
        open={panel === 'end'}
        onOpenChange={close}
      />
      <DeleteApartmentTariffDialog
        apartmentId={apartment.id}
        attachment={attachment}
        open={panel === 'delete'}
        onOpenChange={close}
      />
    </article>
  );
}
