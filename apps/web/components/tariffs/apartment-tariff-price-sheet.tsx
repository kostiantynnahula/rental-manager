'use client';

import { Building2, Users } from 'lucide-react';
import { useState } from 'react';
import { FormSheet } from '@/components/form-sheet';
import type { Apartment } from '@/lib/api/queries/apartments';
import type { ApartmentTariff } from '@/lib/api/queries/apartment-tariffs';
import { ChoiceButton } from './choice-button';
import { OverrideTariffForm } from './override-tariff-form';
import { TariffPriceForm } from './tariff-price-form';

type Mode = 'choose' | 'all' | 'only';

interface ApartmentTariffPriceSheetProps {
  apartment: Apartment;
  attachment: ApartmentTariff;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const TITLES: Record<Mode, string> = {
  choose: 'Змінити ціну',
  all: 'Нова ціна',
  only: 'Окрема ціна для квартири',
};

// A tariff only this apartment uses gets a new price directly. A shared one first asks: a new price for every
// apartment, or an own copy for this one (past months stay on the shared tariff either way).
export function ApartmentTariffPriceSheet({
  apartment,
  attachment,
  open,
  onOpenChange,
}: ApartmentTariffPriceSheetProps) {
  const shared = attachment.tariff.apartmentCount > 1;
  const [mode, setMode] = useState<Mode>(shared ? 'choose' : 'all');
  const close = () => handleOpenChange(false);

  function handleOpenChange(next: boolean) {
    // Next time starts from the choice again.
    if (!next) setMode(shared ? 'choose' : 'all');
    onOpenChange(next);
  }

  return (
    <FormSheet
      open={open}
      onOpenChange={handleOpenChange}
      title={TITLES[mode]}
      description={attachment.tariff.name}
    >
      {open && mode === 'choose' && (
        <div className="grid gap-2">
          <ChoiceButton
            icon={<Users />}
            title={`Для всіх квартир (${attachment.tariff.apartmentCount})`}
            hint="Нова ціна спільного тарифу з обраного місяця"
            onClick={() => setMode('all')}
          />
          <ChoiceButton
            icon={<Building2 />}
            title="Лише для цієї квартири"
            hint={`Окремий тариф для «${apartment.name}»; інші квартири не зміняться`}
            onClick={() => setMode('only')}
          />
        </div>
      )}
      {open && mode === 'all' && <TariffPriceForm tariff={attachment.tariff} onDone={close} />}
      {open && mode === 'only' && (
        <OverrideTariffForm apartment={apartment} attachment={attachment} onDone={close} />
      )}
    </FormSheet>
  );
}
